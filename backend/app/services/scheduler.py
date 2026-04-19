"""
Background scheduler service for automatic model retraining.

Checks every hour if any organization has reached its next_retrain_date
and auto-retrain is enabled. If so, triggers automatic model retraining.
"""

import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db, engine
from ..models import Organization, AuditLog
from ..logging_config import get_logger

logger = get_logger("scheduler")


class AutoRetrainScheduler:
    """Scheduler for automatic model retraining every 40 days."""
    
    def __init__(self, check_interval_hours: int = 1):
        """
        Initialize the scheduler.
        
        Args:
            check_interval_hours: How often to check for retrains (default: 1 hour)
        """
        self.check_interval_hours = check_interval_hours
        self.is_running = False
        self.task = None
    
    async def start(self):
        """Start the background scheduler."""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return
        
        self.is_running = True
        self.task = asyncio.create_task(self._run_scheduler())
        logger.info(f"✅ Auto-retrain scheduler started (checking every {self.check_interval_hours} hour(s))")
    
    async def stop(self):
        """Stop the background scheduler."""
        if not self.is_running:
            logger.warning("Scheduler is not running")
            return
        
        self.is_running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("✅ Auto-retrain scheduler stopped")
    
    async def _run_scheduler(self):
        """Main scheduler loop."""
        while self.is_running:
            try:
                await self._check_and_trigger_retrain()
            except Exception as e:
                logger.error(f"❌ Error in retrain scheduler: {e}")
            
            # Wait for the specified interval
            try:
                await asyncio.sleep(self.check_interval_hours * 3600)
            except asyncio.CancelledError:
                break
    
    async def _check_and_trigger_retrain(self):
        """Check all organizations and trigger retrain if needed."""
        try:
            # Get a database session
            db = next(get_db())
            
            # Query organizations that need retraining
            now = datetime.utcnow()
            
            eligible_orgs = db.query(Organization).filter(
                Organization.auto_retrain_enabled == True,
                Organization.next_retrain_date.isnot(None),
                Organization.next_retrain_date <= now
            ).all()
            
            if eligible_orgs:
                logger.info(f"🔄 Found {len(eligible_orgs)} organization(s) needing retrain")
                
                for org in eligible_orgs:
                    try:
                        await self._trigger_retrain_for_org(org, db)
                    except Exception as e:
                        logger.error(f"❌ Failed to trigger retrain for org {org.id} ({org.name}): {e}")
            else:
                logger.debug("ℹ️  No organizations need retrain at this time")
            
            db.close()
        
        except Exception as e:
            logger.error(f"❌ Error checking retrain status: {e}")
    
    async def _trigger_retrain_for_org(self, org: Organization, db: Session):
        """
        Trigger retraining for a specific organization using REAL production data.
        
        Important: Unlike initial training (which uses generated synthetic data),
        auto-retraining uses only REAL access logs from the database.
        """
        import os
        import sys
        from datetime import timedelta
        
        # Add parent directory to path to import scripts
        script_path = os.path.join(os.path.dirname(__file__), '../../../scripts')
        if script_path not in sys.path:
            sys.path.insert(0, script_path)
        
        # Import retraining pipeline (uses REAL DATA from database)
        from retrain_pipeline import run_retrain_pipeline
        
        try:
            logger.info(f"🚀 Auto-triggering RETRAIN for org {org.id} ({org.name})")
            logger.info(f"   Mode: REAL DATA (production access logs only, no synthetic data)")
            
            # Run RETRAINING pipeline (loads real data from database)
            model_dir = f"ml/models/org_{org.id}"
            os.makedirs(model_dir, exist_ok=True)
            
            success = run_retrain_pipeline(
                db_session=db,
                org_id=org.id,
                output_dir=model_dir
            )
            
            if not success:
                raise Exception("Retraining pipeline failed")
            
            # Update organization with new training dates
            org.last_training_date = datetime.utcnow()
            org.next_retrain_date = org.last_training_date + timedelta(days=40)
            db.commit()
            
            # Log the auto-retrain success
            audit = AuditLog(
                user_id=None,  # System-triggered, no user
                action="ML_AUTO_RETRAIN_COMPLETED",
                resource="ml_model",
                resource_id=org.id,
                details={
                    "triggered_by": "scheduler",
                    "status": "completed",
                    "data_source": "REAL (production access logs)",
                    "model_directory": model_dir,
                    "last_training_date": org.last_training_date.isoformat(),
                    "next_retrain_date": org.next_retrain_date.isoformat()
                }
            )
            db.add(audit)
            db.commit()
            
            logger.info(f"✅ Auto-retrain COMPLETED for org {org.id} ({org.name})")
            logger.info(f"   Data source: Real production access logs")
            logger.info(f"   Next retrain scheduled for: {org.next_retrain_date.isoformat()}")
        
        except Exception as e:
            logger.error(f"❌ Auto-retrain FAILED for org {org.id}: {e}")
            logger.error(f"   Cause: {str(e)}")
            
            # Log the failure
            audit = AuditLog(
                user_id=None,
                action="ML_AUTO_RETRAIN_FAILED",
                resource="ml_model",
                resource_id=org.id,
                details={
                    "triggered_by": "scheduler",
                    "status": "failed",
                    "data_source": "REAL (production access logs)",
                    "error": str(e)
                }
            )
            db.add(audit)
            db.commit()
            
            raise


# Global scheduler instance
scheduler = AutoRetrainScheduler(check_interval_hours=1)


async def start_scheduler():
    """Start the auto-retrain scheduler."""
    await scheduler.start()


async def stop_scheduler():
    """Stop the auto-retrain scheduler."""
    await scheduler.stop()


def get_scheduler() -> AutoRetrainScheduler:
    """Get the global scheduler instance."""
    return scheduler
