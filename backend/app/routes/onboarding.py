import csv
import io
import json
import subprocess
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..schemas.onboarding import (
    OnboardingStatusResponse,
    OnboardingDraftRequest,
    OnboardingDraftResponse,
    OnboardingStep1Payload,
    OnboardingStep2Payload,
    OnboardingStep3Payload,
    OnboardingStep4Payload,
    OnboardingStep5Payload,
    OnboardingStep6Payload,
    OnboardingStep7Payload,
    CSVImportPreview,
    CSVImportResult,
    OrganizationResponse,
    BuildingResponse,
)
from ..schemas.access_point import AccessPointCreate, AccessPointResponse
from ..models import (
    Organization,
    OnboardingDraft,
    OrgDataSetting,
    Building,
    Floor,
    Zone,
    Room,
    AccessPolicy,
    User,
    AccessPoint,
    AuditLog,
)
from ..routes.auth import get_current_user
from ..utils.password import hash_password
from ..services.onboarding_service import get_onboarding_configuration

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin role for onboarding endpoints."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access onboarding endpoints"
        )
    return current_user


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> OnboardingStatusResponse:
    """Get current onboarding status."""
    try:
        # Check if any drafts exist
        latest_draft = db.query(OnboardingDraft).order_by(desc(OnboardingDraft.updated_at)).first()
        
        current_step = latest_draft.step_number if latest_draft else 1
        has_draft = latest_draft is not None
        
        # Calculate completion percentage (steps 1-7, so each step is ~14%)
        completion_percentage = (current_step / 7) * 100 if current_step <= 7 else 100.0
        
        return OnboardingStatusResponse(
            current_step=current_step,
            has_draft=has_draft,
            completion_percentage=completion_percentage,
            errors=[]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get onboarding status: {str(e)}"
        )


@router.post("/draft/save", response_model=OnboardingDraftResponse)
async def save_draft(
    request: OnboardingDraftRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> OnboardingDraftResponse:
    """Save onboarding draft progress."""
    try:
        # Get or create draft
        draft = db.query(OnboardingDraft).filter(
            OnboardingDraft.step_number == request.step_number
        ).first()
        
        if draft:
            draft.draft_data = request.draft_data
            db.commit()
        else:
            draft = OnboardingDraft(
                step_number=request.step_number,
                draft_data=request.draft_data
            )
            db.add(draft)
            db.commit()
        
        db.refresh(draft)
        
        # Log to audit trail
        audit = AuditLog(
            user_id=current_user.id,
            action="ONBOARDING_DRAFT_SAVE",
            resource="onboarding_draft",
            resource_id=draft.id,
            details={"step": request.step_number}
        )
        db.add(audit)
        db.commit()
        
        return OnboardingDraftResponse.model_validate(draft)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save draft: {str(e)}"
        )


@router.get("/draft", response_model=Optional[OnboardingDraftResponse])
async def load_draft(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Optional[OnboardingDraftResponse]:
    """Load existing onboarding draft."""
    try:
        # Get most recent draft
        draft = db.query(OnboardingDraft).order_by(desc(OnboardingDraft.updated_at)).first()
        
        if not draft:
            return None
        
        return OnboardingDraftResponse.model_validate(draft)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load draft: {str(e)}"
        )


@router.post("/submit")
async def submit_onboarding(
    step1: OnboardingStep1Payload,
    step2: Optional[OnboardingStep2Payload] = None,
    step3: Optional[OnboardingStep3Payload] = None,
    step4: Optional[OnboardingStep4Payload] = None,
    step5: Optional[OnboardingStep5Payload] = None,
    step6: Optional[OnboardingStep6Payload] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Submit complete onboarding for validation."""
    try:
        errors = []
        
        # Validate step 1 (company profile)
        if not step1.company_name:
            errors.append("Company name is required")
        
        # Validate step 2 if provided
        if step2 and len(step2.initial_admins) == 0:
            errors.append("At least one admin must be specified")
        
        # Validate step 3 if provided
        if step3 and len(step3.buildings) == 0:
            errors.append("At least one building must be specified")
        
        if errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"errors": errors}
            )
        
        return {
            "status": "valid",
            "message": "Onboarding submission is valid and ready to apply"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit onboarding: {str(e)}"
        )


@router.post("/apply", response_model=OrganizationResponse)
async def apply_onboarding(
    step1: OnboardingStep1Payload,
    step2: Optional[OnboardingStep2Payload] = None,
    step3: Optional[OnboardingStep3Payload] = None,
    step4: Optional[OnboardingStep4Payload] = None,
    step5: Optional[OnboardingStep5Payload] = None,
    step6: Optional[OnboardingStep6Payload] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> OrganizationResponse:
    """Apply onboarding - create all organization configuration."""
    try:
        # Start transaction
        # 1. Create organization
        org = Organization(
            name=step1.company_name,
            industry=step1.industry,
            country=step1.country,
            timezone=step1.timezone,
            contact_email=step1.contact_email,
            contact_phone=step1.contact_phone,
        )
        db.add(org)
        db.flush()  # Flush to get org.id without committing
        
        # 2. Create initial admins (step 2)
        if step2:
            for admin_data in step2.initial_admins:
                admin = User(
                    badge_id=f"ADMIN_{org.id}_{admin_data.get('email', 'unknown')}",
                    first_name=admin_data.get('first_name', 'Admin'),
                    last_name=admin_data.get('last_name', 'User'),
                    email=admin_data.get('email', ''),
                    role="admin",
                    pin_hash=hash_password(admin_data.get('password', '')),
                    org_id=org.id,
                    is_active=True,
                )
                db.add(admin)
        
        # 3. Create buildings, floors, zones, rooms (step 3)
        if step3:
            for building_data in step3.buildings:
                building = Building(
                    org_id=org.id,
                    name=building_data.get('name', ''),
                    address=building_data.get('address'),
                    city=building_data.get('city'),
                    state=building_data.get('state'),
                    country=building_data.get('country'),
                    zip=building_data.get('zip'),
                )
                db.add(building)
                db.flush()
                
                # Create floors
                for floor_data in building_data.get('floors', []):
                    floor = Floor(
                        building_id=building.id,
                        floor_number=floor_data.get('floor_number', 0),
                        name=floor_data.get('name'),
                        total_rooms=floor_data.get('total_rooms'),
                    )
                    db.add(floor)
                    db.flush()
                    
                    # Create zones
                    for zone_data in floor_data.get('zones', []):
                        zone = Zone(
                            floor_id=floor.id,
                            name=zone_data.get('name', ''),
                            security_level=zone_data.get('security_level', 1),
                            description=zone_data.get('description'),
                        )
                        db.add(zone)
                        db.flush()
                        
                        # Create rooms
                        for room_data in zone_data.get('rooms', []):
                            room = Room(
                                zone_id=zone.id,
                                name=room_data.get('name', ''),
                                room_number=room_data.get('room_number'),
                                capacity=room_data.get('capacity'),
                            )
                            db.add(room)
        
        # 4. Create access points (step 4)
        if step4:
            for ap_data in step4.access_points:
                ap = AccessPoint(
                    name=ap_data.get('name', ''),
                    type=ap_data.get('type', 'door'),
                    building=ap_data.get('building', ''),
                    floor=ap_data.get('floor'),
                    room=ap_data.get('room'),
                    zone=ap_data.get('zone'),
                    status='active',
                    required_clearance=ap_data.get('required_clearance', 1),
                    is_restricted=ap_data.get('is_restricted', False),
                    org_id=org.id,
                )
                db.add(ap)
        
        # 5. Create access policies (step 5)
        if step5:
            for policy_data in step5.access_policies:
                policy = AccessPolicy(
                    org_id=org.id,
                    name=policy_data.name,
                    description=policy_data.description,
                    base_clearance=policy_data.base_clearance,
                    deny_overrides_allow=policy_data.deny_overrides_allow,
                    two_person_required=policy_data.two_person_required,
                    step_up_required_risk=policy_data.step_up_required_risk,
                )
                db.add(policy)
        
        # 6. Create org data settings (step 6)
        if step6:
            org_settings = OrgDataSetting(
                org_id=org.id,
                pii_masking_enabled=step6.pii_masking_enabled,
                retention_days=step6.retention_days,
            )
            db.add(org_settings)
        else:
            # Create default settings
            org_settings = OrgDataSetting(
                org_id=org.id,
                pii_masking_enabled=False,
                retention_days=90,
            )
            db.add(org_settings)
        
        # Commit all changes
        db.commit()
        db.refresh(org)
        
        # Log to audit trail
        audit = AuditLog(
            user_id=current_user.id,
            action="ONBOARDING_APPLY",
            resource="organization",
            resource_id=org.id,
            details={"org_name": org.name}
        )
        db.add(audit)
        db.commit()
        
        return OrganizationResponse.model_validate(org)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply onboarding: {str(e)}"
        )


@router.post("/import/buildings-csv", response_model=CSVImportPreview)
async def preview_buildings_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> CSVImportPreview:
    """Preview and validate buildings CSV import."""
    try:
        content = await file.read()
        text = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(text))
        
        required_fields = ['name', 'city', 'state', 'country']
        total_rows = 0
        valid_rows = 0
        invalid_rows = 0
        validation_errors = []
        preview_data = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (skip header)
            total_rows += 1
            errors = []
            
            # Validate required fields
            for field in required_fields:
                if not row.get(field):
                    errors.append(f"Missing required field: {field}")
            
            if errors:
                invalid_rows += 1
                validation_errors.append({
                    "row": row_num,
                    "errors": errors,
                    "data": dict(row)
                })
            else:
                valid_rows += 1
                preview_data.append(dict(row))
        
        return CSVImportPreview(
            total_rows=total_rows,
            valid_rows=valid_rows,
            invalid_rows=invalid_rows,
            validation_errors=validation_errors,
            preview_data=preview_data[:10]  # Preview first 10
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process CSV: {str(e)}"
        )


@router.post("/import/access-points-csv", response_model=CSVImportPreview)
async def preview_access_points_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> CSVImportPreview:
    """Preview and validate access points CSV import."""
    try:
        content = await file.read()
        text = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(text))
        
        required_fields = ['name', 'type', 'building']
        total_rows = 0
        valid_rows = 0
        invalid_rows = 0
        validation_errors = []
        preview_data = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (skip header)
            total_rows += 1
            errors = []
            
            # Validate required fields
            for field in required_fields:
                if not row.get(field):
                    errors.append(f"Missing required field: {field}")
            
            # Validate clearance level if present
            if row.get('required_clearance'):
                try:
                    clearance = int(row.get('required_clearance', 1))
                    if clearance not in [1, 2, 3]:
                        errors.append("required_clearance must be 1, 2, or 3")
                except ValueError:
                    errors.append("required_clearance must be a number")
            
            if errors:
                invalid_rows += 1
                validation_errors.append({
                    "row": row_num,
                    "errors": errors,
                    "data": dict(row)
                })
            else:
                valid_rows += 1
                preview_data.append(dict(row))
        
        return CSVImportPreview(
            total_rows=total_rows,
            valid_rows=valid_rows,
            invalid_rows=invalid_rows,
            validation_errors=validation_errors,
            preview_data=preview_data[:10]  # Preview first 10
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process CSV: {str(e)}"
        )


@router.get("/stats")
async def get_onboarding_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get onboarding statistics (buildings, users, policies count)."""
    try:
        # Count organizations
        org_count = db.query(Organization).count()
        
        # Count buildings
        building_count = db.query(Building).count()
        
        # Count users created through onboarding
        user_count = db.query(User).filter(User.org_id.isnot(None)).count()
        
        # Count access policies
        policy_count = db.query(AccessPolicy).count()
        
        return {
            "organizations_created": org_count,
            "buildings_total": building_count,
            "users_onboarded": user_count,
            "access_policies_created": policy_count,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get onboarding stats: {str(e)}"
        )


@router.get("/configuration/{org_id}")
async def get_organization_configuration(
    org_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieve complete onboarding configuration for an organization.
    This configuration can be used to generate training data customized for the client's infrastructure.
    """
    try:
        config = get_onboarding_configuration(org_id, db)
        
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Organization with id {org_id} not found"
            )
        
        return {
            "status": "success",
            "data": config
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve configuration: {str(e)}"
        )


@router.post("/generate-training-data/{org_id}")
async def generate_training_data(
    org_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Trigger training data generation based on the organization's onboarding configuration.
    This creates synthetic training data customized to the client's infrastructure.
    
    Data generated includes:
    - Access logs based on buildings, zones, and access points
    - User profiles aligned with admin roles and structure
    - Access patterns based on defined policies
    - Anomalies calibrated to the organization's security baseline
    """
    try:
        # Retrieve onboarding configuration
        config = get_onboarding_configuration(org_id, db)
        
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Organization with id {org_id} not found"
            )
        
        # Prepare configuration file
        config_file = f"data/raw/org_{org_id}_config.json"
        output_file = f"data/raw/org_{org_id}_training_data.csv"
        
        import os
        os.makedirs("data/raw", exist_ok=True)
        
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        # Schedule background task to generate training data
        background_tasks.add_task(
            generate_training_data_task,
            org_id=org_id,
            config_file=config_file,
            output_file=output_file,
            db=db,
            user_id=current_user.id
        )
        
        # Log the request
        audit = AuditLog(
            user_id=current_user.id,
            action="TRAINING_DATA_GENERATE",
            resource="organization",
            resource_id=org_id,
            details={
                "config_file": config_file,
                "output_file": output_file,
                "org_name": config["organization"]["name"]
            }
        )
        db.add(audit)
        db.commit()
        
        return {
            "status": "generating",
            "message": f"Training data generation started for organization {config['organization']['name']}",
            "org_id": org_id,
            "output_file": output_file,
            "config_file": config_file
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate training data: {str(e)}"
        )


def generate_training_data_task(
    org_id: int,
    config_file: str,
    output_file: str,
    db: Session,
    user_id: int
):
    """Background task to generate training data based on organization configuration."""
    try:
        # Import the training data generation module
        import sys
        sys.path.insert(0, '/e/RAPTORX')
        
        from scripts.generate_training_data_from_onboarding import generate_data_from_config
        
        # Generate training data
        generate_data_from_config(
            config_file=config_file,
            output_file=output_file,
            org_id=org_id
        )
        
        # Log completion
        audit = AuditLog(
            user_id=user_id,
            action="TRAINING_DATA_GENERATED",
            resource="organization",
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
            action="TRAINING_DATA_GENERATE_FAILED",
            resource="organization",
            resource_id=org_id,
            details={
                "error": str(e)
            }
        )
        db.add(audit)
        db.commit()

