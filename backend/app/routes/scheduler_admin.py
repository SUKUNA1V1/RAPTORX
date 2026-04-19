"""
Admin endpoints for controlling the auto-retrain scheduler.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, AuditLog
from ..routes.auth import get_current_user
from ..services.scheduler import get_scheduler
from ..logging_config import get_logger

logger = get_logger("scheduler_routes")

router = APIRouter(prefix="/api/admin/scheduler", tags=["admin", "scheduler"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin role."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access scheduler endpoints"
        )
    return current_user


@router.get("/status")
async def get_scheduler_status(
    current_user: User = Depends(require_admin),
):
    """
    Get current scheduler status.
    
    Returns:
    - is_running: Whether scheduler is active
    - check_interval_hours: How often scheduler checks for retrains
    - description: Current status description
    """
    try:
        scheduler = get_scheduler()
        return {
            "status": "ok",
            "is_running": scheduler.is_running,
            "check_interval_hours": scheduler.check_interval_hours,
            "description": f"Scheduler is {'✅ running' if scheduler.is_running else '⏸️ stopped'}",
            "next_check_in": "~1 hour" if scheduler.is_running else "N/A"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get scheduler status: {str(e)}"
        )


@router.post("/start")
async def start_scheduler_endpoint(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Manually start the auto-retrain scheduler.
    
    The scheduler checks every hour for organizations that need retraining
    and automatically triggers model retraining if:
    - auto_retrain_enabled = True
    - next_retrain_date <= NOW
    """
    try:
        scheduler = get_scheduler()
        
        if scheduler.is_running:
            return {
                "status": "ok",
                "message": "✅ Scheduler is already running",
                "is_running": True
            }
        
        import asyncio
        await scheduler.start()
        
        # Log the action
        audit = AuditLog(
            user_id=current_user.id,
            action="SCHEDULER_STARTED",
            resource="scheduler",
            resource_id=None,
            details={"triggered_by": "admin", "status": "started"}
        )
        db.add(audit)
        db.commit()
        
        logger.info(f"✅ Scheduler started by admin {current_user.email}")
        
        return {
            "status": "success",
            "message": "✅ Auto-retrain scheduler has been started",
            "is_running": True,
            "check_interval": f"{scheduler.check_interval_hours} hour(s)"
        }
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start scheduler: {str(e)}"
        )


@router.post("/stop")
async def stop_scheduler_endpoint(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Manually stop the auto-retrain scheduler.
    
    When stopped, organizations won't automatically retrain even if
    next_retrain_date has passed. Manual retraining via /api/ml/trigger-retrain
    will still work.
    """
    try:
        scheduler = get_scheduler()
        
        if not scheduler.is_running:
            return {
                "status": "ok",
                "message": "✅ Scheduler is already stopped",
                "is_running": False
            }
        
        import asyncio
        await scheduler.stop()
        
        # Log the action
        audit = AuditLog(
            user_id=current_user.id,
            action="SCHEDULER_STOPPED",
            resource="scheduler",
            resource_id=None,
            details={"triggered_by": "admin", "status": "stopped"}
        )
        db.add(audit)
        db.commit()
        
        logger.info(f"✅ Scheduler stopped by admin {current_user.email}")
        
        return {
            "status": "success",
            "message": "✅ Auto-retrain scheduler has been stopped",
            "is_running": False,
            "note": "Manual retraining is still available via /api/ml/trigger-retrain"
        }
    except Exception as e:
        logger.error(f"❌ Failed to stop scheduler: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop scheduler: {str(e)}"
        )
