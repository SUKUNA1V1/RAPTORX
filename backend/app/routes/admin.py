from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas.user import UserCreate, UserResponse, UserUpdate
from ..utils.password import hash_password, verify_password


# Schemas
class AdminCreateRequest(BaseModel):
    email: EmailStr
    temp_password: str
    role: str
    first_name: str = "Admin"
    last_name: str = "User"


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str


# Purpose: Admin management endpoints with password management, user creation/deletion.
router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/login", response_model=LoginResponse)
def admin_login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate admin user with email and password."""
    try:
        # Normalize email input
        email = credentials.email.strip().lower() if credentials.email else ""
        password = credentials.password.strip() if credentials.password else ""
        
        if not email or not password:
            raise HTTPException(status_code=422, detail="Email and password are required")
        
        # Find user by email
        user = db.query(User).filter(User.email.ilike(email)).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if user is admin or security (admin roles)
        if user.role.lower() not in ["admin", "security"]:
            raise HTTPException(status_code=401, detail="User is not an administrator")
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(status_code=401, detail="User account is inactive")
        
        # Verify password
        if not user.pin_hash or not verify_password(password, user.pin_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return LoginResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/profile", response_model=UserResponse)
def get_admin_profile(
    admin_id: int = Query(..., description="Admin user ID"),
    db: Session = Depends(get_db),
):
    """Get current admin profile information."""
    try:
        user = db.query(User).filter(User.id == admin_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Admin user not found")
        # Verify user is an admin (case-insensitive check)
        admin_roles = ["super admin", "admin", "read-only admin"]
        if user.role.lower() not in admin_roles:
            raise HTTPException(status_code=403, detail="User is not an administrator")
        return user
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/profile/username", response_model=UserResponse)
def update_admin_username(
    admin_id: int = Query(..., description="Admin user ID"),
    new_email: str = Query(..., description="New email/username"),
    db: Session = Depends(get_db),
):
    """Update admin's email/username."""
    try:
        user = db.query(User).filter(User.id == admin_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Admin user not found")
        admin_roles = ["super admin", "admin", "read-only admin"]
        if user.role.lower() not in admin_roles:
            raise HTTPException(status_code=403, detail="User is not an administrator")

        # Check if new email is already taken
        existing = db.query(User).filter(
            and_(User.email == new_email, User.id != admin_id)
        ).first()
        if existing:
            raise HTTPException(status_code=422, detail="Email already in use")

        user.email = new_email
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/profile/password", response_model=dict)
def change_admin_password(
    admin_id: int = Query(..., description="Admin user ID"),
    current_password: str = Query(..., description="Current password"),
    new_password: str = Query(..., description="New password"),
    db: Session = Depends(get_db),
):
    """Change admin password."""
    try:
        user = db.query(User).filter(User.id == admin_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Admin user not found")
        admin_roles = ["super admin", "admin", "read-only admin"]
        if user.role.lower() not in admin_roles:
            raise HTTPException(status_code=403, detail="User is not an administrator")

        # Verify current password
        if not user.pin_hash or not verify_password(current_password, user.pin_hash):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

        # Update password
        user.pin_hash = hash_password(new_password)
        db.add(user)
        db.commit()
        
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/list", response_model=list[UserResponse])
def list_admins(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    """List all administrators."""
    try:
        # Filter for admin and security roles
        admins = db.query(User).filter(
            User.role.in_(["admin", "security"])
        ).offset(skip).limit(limit).all()
        return admins
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_admin(
    admin_data: AdminCreateRequest,
    db: Session = Depends(get_db),
):
    """Create a new administrator account."""
    try:
        # Check if email already exists
        if db.query(User).filter(User.email == admin_data.email).first():
            raise HTTPException(status_code=422, detail="Email already exists")

        # Verify role is valid admin role (must be admin or security)
        valid_admin_roles = ["admin", "security"]
        if admin_data.role.lower() not in valid_admin_roles:
            raise HTTPException(status_code=422, detail="Invalid admin role. Must be 'admin' or 'security'")

        # Create unique badge_id from email
        badge_id = f"ADMIN_{admin_data.email.split('@')[0].upper()}"
        if db.query(User).filter(User.badge_id == badge_id).first():
            badge_id = f"ADMIN_{admin_data.email.split('@')[0].upper()}_{int(datetime.now().timestamp())}"

        # Create admin user
        admin_user = User(
            badge_id=badge_id,
            first_name=admin_data.first_name,
            last_name=admin_data.last_name,
            email=admin_data.email,
            role=admin_data.role,
            clearance_level=3,
            is_active=True,
            pin_hash=hash_password(admin_data.temp_password),
            phone=None,
            department="Administration",
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        return admin_user
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        import traceback
        error_detail = f"{str(exc)} | {traceback.format_exc()}"
        print(f"ERROR in create_admin: {error_detail}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/{admin_id}", response_model=dict)
def delete_admin(
    admin_id: int,
    db: Session = Depends(get_db),
):
    """Delete an administrator account."""
    try:
        admin = db.query(User).filter(User.id == admin_id).first()
        if not admin:
            raise HTTPException(status_code=404, detail="Admin user not found")
        
        admin_roles = ["admin", "security"]
        if admin.role.lower() not in admin_roles:
            raise HTTPException(status_code=403, detail="User is not an administrator")

        # Soft delete by marking inactive
        admin.is_active = False
        db.add(admin)
        db.commit()
        
        return {"message": f"Admin {admin.email} deactivated successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
