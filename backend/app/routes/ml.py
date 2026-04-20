import json
import os
import subprocess
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Organization, User, AuditLog
from ..routes.auth import get_current_user
from ..services.onboarding_service import get_onboarding_configuration

router = APIRouter(prefix="/ml", tags=["ml"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin role for ML endpoints."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access ML endpoints"
        )
    return current_user


@router.get("/status", status_code=status.HTTP_200_OK)
def ml_status_public():
    """
    Public endpoint: Return model loading/threshold status for frontend diagnostics.
    No authentication required - used by dashboard to show ML system health.
    """
    try:
        from .access import get_engine
        engine = get_engine()
        return engine.status()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get ML status: {str(e)}"
        )


@router.post("/generate-training-data")
async def generate_training_data(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Generate synthetic training data for the current organization based on onboarding configuration.
    
    Steps:
    1. Retrieve organization's onboarding config from database
    2. Save config to JSON file
    3. Run training data generation script asynchronously
    4. Log the action
    
    Response: Returns immediately with status "generating"
    """
    try:
        # Get organization from current user (assumed admin belongs to org)
        org = db.query(Organization).first()
        
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        # Retrieve onboarding configuration
        config = get_onboarding_configuration(org.id, db)
        
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Onboarding configuration not found. Complete onboarding first."
            )
        
        # Prepare file paths
        config_file = f"data/raw/org_{org.id}_config.json"
        output_file = f"data/raw/org_{org.id}_training_data.csv"
        
        os.makedirs("data/raw", exist_ok=True)
        
        # Save configuration to file
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        # Schedule background task
        background_tasks.add_task(
            _generate_training_data_task,
            org_id=org.id,
            config_file=config_file,
            output_file=output_file,
            db=db,
            user_id=current_user.id
        )
        
        # Log action
        audit = AuditLog(
            user_id=current_user.id,
            action="TRAINING_DATA_GENERATE_REQUESTED",
            resource="ml_training",
            resource_id=org.id,
            details={
                "config_file": config_file,
                "output_file": output_file
            }
        )
        db.add(audit)
        db.commit()
        
        return {
            "status": "generating",
            "message": "Training data generation started",
            "config_file": config_file,
            "output_file": output_file
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate training data: {str(e)}"
        )


@router.post("/train")
async def train_models(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Train ML ensemble models on previously generated training data.
    
    Steps:
    1. Locate training data file (org_{org_id}_training_data.csv)
    2. Run training pipeline asynchronously
    3. Save trained models to ml/models/ directory
    4. Log the training action
    
    Response: Returns immediately with status "training"
    """
    try:
        # Get organization
        org = db.query(Organization).first()
        
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        # Check if training data exists
        training_data_file = f"data/raw/org_{org.id}_training_data.csv"
        
        if not os.path.exists(training_data_file):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Training data not found. Generate training data first."
            )
        
        # Schedule background training task
        background_tasks.add_task(
            _train_models_task,
            org_id=org.id,
            training_data_file=training_data_file,
            db=db,
            user_id=current_user.id
        )
        
        # Log action
        audit = AuditLog(
            user_id=current_user.id,
            action="ML_TRAINING_STARTED",
            resource="ml_model",
            resource_id=org.id,
            details={
                "training_data_file": training_data_file,
                "status": "training_in_progress"
            }
        )
        db.add(audit)
        db.commit()
        
        return {
            "status": "training",
            "message": "Model training started. This may take 5-10 minutes.",
            "training_data_file": training_data_file,
            "estimated_duration": "5-10 minutes"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start model training: {str(e)}"
        )


@router.post("/use-hard-rules")
async def use_hard_rules(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Switch access control decision engine to hard rules mode.
    
    Steps:
    1. Update organization settings to use hard rules
    2. Log the mode switch
    
    Response: Confirms mode switch to "hard_rules"
    """
    try:
        # Get organization
        org = db.query(Organization).first()
        
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        # Update decision mode (assuming org has a decision_mode column)
        # If not, you may need to add this column to the Organization model
        org.decision_mode = "hard_rules"
        db.commit()
        
        # Log action
        audit = AuditLog(
            user_id=current_user.id,
            action="DECISION_MODE_SWITCHED",
            resource="organization",
            resource_id=org.id,
            details={
                "new_mode": "hard_rules",
                "description": "Switched to predefined business rules for access control"
            }
        )
        db.add(audit)
        db.commit()
        
        return {
            "status": "success",
            "message": "✅ Switched to Hard Rules mode",
            "mode": "hard_rules",
            "description": "Access decisions now use predefined business rules"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to switch to hard rules mode: {str(e)}"
        )


@router.post("/use-models")
async def use_models(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Switch access control decision engine to ML model mode.
    
    Steps:
    1. Verify trained models exist
    2. Update organization settings to use ML models
    3. Load models into decision engine
    4. Log the mode switch
    
    Response: Confirms mode switch to "ml_models"
    """
    try:
        # Get organization
        org = db.query(Organization).first()
        
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        # Check if trained models exist
        # Compute correct path to ml/models from project root
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__ or ".")))
        model_dir = os.path.normpath(os.path.join(project_root, "..", "ml", "models", f"org_{org.id}"))
        
        if not os.path.exists(model_dir):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trained models not found. Train models first using the 'Train ML Models' button."
            )
        
        # Update decision mode
        org.decision_mode = "ml_models"
        db.commit()
        
        # Log action
        audit = AuditLog(
            user_id=current_user.id,
            action="DECISION_MODE_SWITCHED",
            resource="organization",
            resource_id=org.id,
            details={
                "new_mode": "ml_models",
                "description": "Switched to ML ensemble models for access control",
                "model_directory": model_dir
            }
        )
        db.add(audit)
        db.commit()
        
        return {
            "status": "success",
            "message": "✅ Switched to Model-Based Decisions",
            "mode": "ml_models",
            "description": "Access control now uses ML ensemble models",
            "model_directory": model_dir
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to switch to ML models mode: {str(e)}"
        )


@router.get("/status-admin")
async def get_ml_status_admin(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint: Get detailed ML status including:
    - Current decision mode (hard_rules or ml_models)
    - Whether training data exists
    - Whether trained models exist
    - Last training timestamp
    """
    try:
        org = db.query(Organization).first()
        
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        training_data_file = f"data/raw/org_{org.id}_training_data.csv"
        model_dir = f"ml/models/org_{org.id}"
        
        # Compute correct absolute paths
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__ or ".")))
        training_data_file = os.path.normpath(os.path.join(project_root, "..", training_data_file))
        model_dir = os.path.normpath(os.path.join(project_root, "..", model_dir))
        
        has_training_data = os.path.exists(training_data_file)
        has_models = os.path.exists(model_dir)
        
        return {
            "status": "ok",
            "current_mode": getattr(org, 'decision_mode', 'hard_rules'),
            "has_training_data": has_training_data,
            "has_models": has_models,
            "training_data_file": training_data_file if has_training_data else None,
            "model_directory": model_dir if has_models else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get ML status: {str(e)}"
        )


@router.get("/retrain-status")
async def get_retrain_status(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get auto-retrain status including:
    - Last training date
    - Next scheduled retrain date
    - Time remaining until next retrain (in seconds, days, hours, minutes)
    - Auto-retrain enabled status
    - Whether retrain is overdue
    """
    try:
        org = db.query(Organization).first()
        
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        now = datetime.utcnow()
        
        # Calculate time remaining
        if org.next_retrain_date:
            time_diff = org.next_retrain_date - now
            seconds_remaining = max(0, int(time_diff.total_seconds()))
            
            # Convert to human-readable format
            days = seconds_remaining // 86400
            hours = (seconds_remaining % 86400) // 3600
            minutes = (seconds_remaining % 3600) // 60
            
            is_overdue = seconds_remaining <= 0
            
            return {
                "status": "ok",
                "auto_retrain_enabled": getattr(org, 'auto_retrain_enabled', True),
                "last_training_date": org.last_training_date.isoformat() if org.last_training_date else None,
                "next_retrain_date": org.next_retrain_date.isoformat(),
                "seconds_remaining": seconds_remaining,
                "days_remaining": days,
                "hours_remaining": hours,
                "minutes_remaining": minutes,
                "is_overdue": is_overdue,
                "formatted_remaining": f"{days}d {hours}h {minutes}m"
            }
        else:
            # No training has been done yet
            return {
                "status": "ok",
                "auto_retrain_enabled": getattr(org, 'auto_retrain_enabled', True),
                "last_training_date": None,
                "next_retrain_date": None,
                "seconds_remaining": None,
                "days_remaining": None,
                "hours_remaining": None,
                "minutes_remaining": None,
                "is_overdue": False,
                "formatted_remaining": "No training yet",
                "message": "Train models first to schedule auto-retrain"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get retrain status: {str(e)}"
        )


@router.post("/trigger-retrain")
async def trigger_retrain(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Manually trigger an immediate model retrain.
    This is called automatically by the scheduler or manually by admin.
    """
    try:
        org = db.query(Organization).first()
        
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        # Check if training data exists
        training_data_file = f"data/raw/org_{org.id}_training_data.csv"
        
        if not os.path.exists(training_data_file):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Training data not found. Cannot trigger retrain."
            )
        
        # Schedule background retraining task
        background_tasks.add_task(
            _train_models_task,
            org_id=org.id,
            training_data_file=training_data_file,
            db=db,
            user_id=current_user.id
        )
        
        # Log action
        audit = AuditLog(
            user_id=current_user.id,
            action="ML_AUTO_RETRAIN_TRIGGERED",
            resource="ml_model",
            resource_id=org.id,
            details={
                "triggered_by": "manual" if current_user.id else "scheduler",
                "status": "retrain_scheduled"
            }
        )
        db.add(audit)
        db.commit()
        
        return {
            "status": "retraining",
            "message": "Model retrain has been triggered",
            "estimated_duration": "5-10 minutes"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger retrain: {str(e)}"
        )


@router.post("/toggle-auto-retrain")
async def toggle_auto_retrain(
    enabled: bool,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Enable or disable automatic model retraining every 40 days.
    """
    try:
        org = db.query(Organization).first()
        
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        org.auto_retrain_enabled = enabled
        db.commit()
        
        # Log action
        audit = AuditLog(
            user_id=current_user.id,
            action="AUTO_RETRAIN_SETTING_CHANGED",
            resource="organization",
            resource_id=org.id,
            details={
                "auto_retrain_enabled": enabled
            }
        )
        db.add(audit)
        db.commit()
        
        status_text = "enabled" if enabled else "disabled"
        return {
            "status": "success",
            "message": f"Auto-retrain has been {status_text}",
            "auto_retrain_enabled": enabled
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle auto-retrain: {str(e)}"
        )


@router.get("/model-versions")
async def get_model_versions(
    current_user: User = Depends(require_admin),
):
    """
    Get available model versions from registry.
    Shows current version and previous versions for rollback.
    """
    try:
        import sys
        from pathlib import Path
        
        # Get the project root directory (one level above backend)
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        project_root = os.path.dirname(backend_dir)  # Go up one more level to project root
        sys.path.insert(0, project_root)
        
        from scripts.model_registry import _load_registry, _versions_root
        
        # Compute correct path to ml/models from project root
        models_dir = os.path.join(project_root, "ml", "models")
        models_dir = os.path.normpath(os.path.abspath(models_dir))
        registry = _load_registry(models_dir)
        
        # Get current versions
        current = registry.get("current", {})
        
        # List all available versions for each model
        versions_root = _versions_root(models_dir)
        all_versions = {}
        
        if versions_root.exists():
            for model_key in versions_root.iterdir():
                if model_key.is_dir():
                    versions = []
                    for version_dir in sorted(model_key.iterdir(), reverse=True):
                        if version_dir.is_dir():
                            versions.append({
                                "version_id": version_dir.name,
                                "timestamp": version_dir.name,  # ISO format
                                "is_current": version_dir.name == current.get(model_key.name, {}).get("version")
                            })
                    if versions:
                        all_versions[model_key.name] = versions
        
        return {
            "status": "ok",
            "current_versions": current,
            "available_versions": all_versions,
            "message": f"Found {len(all_versions)} models with version history"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model versions: {str(e)}"
        )


@router.post("/restore-model-version")
async def restore_model_version(
    model_key: str,
    version_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Restore a specific model version from registry.
    This allows rollback to previous models if new ones perform poorly.
    """
    try:
        import sys
        import shutil
        from pathlib import Path
        
        # Get the project root directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        project_root = os.path.dirname(backend_dir)
        sys.path.insert(0, project_root)
        
        from scripts.model_registry import _load_registry, _versions_root, _save_registry
        
        # Compute correct path to ml/models from project root
        models_dir = os.path.join(project_root, "ml", "models")
        models_dir = os.path.normpath(os.path.abspath(models_dir))
        registry = _load_registry(models_dir)
        current = registry.get("current", {})
        
        # Verify version exists
        version_path = _versions_root(models_dir) / model_key / version_id
        if not version_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model version {version_id} not found"
            )
        
        # Get artifacts from version directory
        artifacts = list(version_path.glob("*"))
        if not artifacts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Version {version_id} has no artifacts"
            )
        
        # Restore artifacts to root models directory
        for src in artifacts:
            dst = Path(models_dir) / src.name
            shutil.copy2(src, dst)
        
        # Update registry to mark this as current
        current[model_key] = {
            "version": version_id,
            "updated_at": datetime.utcnow().isoformat(),
            "restored": True,
            "restored_by": current_user.id,
            "restored_at": datetime.utcnow().isoformat()
        }
        registry["current"] = current
        registry["updated_at"] = datetime.utcnow().isoformat()
        _save_registry(models_dir, registry)
        
        # Log action
        org = db.query(Organization).first()
        audit = AuditLog(
            user_id=current_user.id,
            action="MODEL_VERSION_RESTORED",
            resource="ml_model",
            resource_id=org.id if org else 0,
            details={
                "model_key": model_key,
                "version_id": version_id,
                "status": "restored"
            }
        )
        db.add(audit)
        db.commit()
        
        return {
            "status": "success",
            "message": f"Model '{model_key}' restored to version {version_id}",
            "model_key": model_key,
            "version_id": version_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restore model version: {str(e)}"
        )


# ============================================================================
# Background Tasks
# ============================================================================

def _generate_training_data_task(
    org_id: int,
    config_file: str,
    output_file: str,
    db: Session,
    user_id: int
):
    """Background task: Generate training data from organization configuration."""
    try:
        # Import training data generation module
        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        from scripts.generate_training_data_from_onboarding import generate_data_from_config
        
        # Generate training data
        generate_data_from_config(
            config_file=config_file,
            output_file=output_file,
            org_id=org_id
        )
        
        # Log successful completion
        audit = AuditLog(
            user_id=user_id,
            action="TRAINING_DATA_GENERATED_COMPLETED",
            resource="ml_training",
            resource_id=org_id,
            details={
                "output_file": output_file,
                "status": "completed"
            }
        )
        db.add(audit)
        db.commit()
        
    except Exception as e:
        # Log error
        audit = AuditLog(
            user_id=user_id,
            action="TRAINING_DATA_GENERATION_FAILED",
            resource="ml_training",
            resource_id=org_id,
            details={
                "error": str(e),
                "status": "failed"
            }
        )
        db.add(audit)
        db.commit()


def _train_models_task(
    org_id: int,
    training_data_file: str,
    db: Session,
    user_id: int
):
    """Background task: Train ML ensemble models on training data."""
    try:
        import sys
        
        # Get the project root directory
        backend_file_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__ or ".")))
        project_root = os.path.dirname(backend_file_dir)
        sys.path.insert(0, project_root)
        
        from scripts.run_full_pipeline import run_training_pipeline
        
        # Ensure output directory exists with correct absolute path
        model_dir = os.path.join(project_root, "ml", "models", f"org_{org_id}")
        os.makedirs(model_dir, exist_ok=True)
        
        # Run training pipeline
        run_training_pipeline(
            training_data_file=training_data_file,
            output_dir=model_dir
        )
        
        # Update organization with training date and next retrain date
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if org:
            now = datetime.utcnow()
            org.last_training_date = now
            org.next_retrain_date = now + timedelta(days=40)  # Next retrain in 40 days
            db.commit()
        
        # Log successful completion
        audit = AuditLog(
            user_id=user_id,
            action="ML_TRAINING_COMPLETED",
            resource="ml_model",
            resource_id=org_id,
            details={
                "model_directory": model_dir,
                "status": "completed",
                "last_training_date": org.last_training_date.isoformat() if org else None,
                "next_retrain_date": org.next_retrain_date.isoformat() if org else None
            }
        )
        db.add(audit)
        db.commit()
        
    except Exception as e:
        # Log error
        audit = AuditLog(
            user_id=user_id,
            action="ML_TRAINING_FAILED",
            resource="ml_model",
            resource_id=org_id,
            details={
                "error": str(e),
                "status": "failed"
            }
        )
        db.add(audit)
        db.commit()
