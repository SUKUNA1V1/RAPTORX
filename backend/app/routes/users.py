from typing import Optional
from math import ceil
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas.user import UserCreate, UserResponse, UserUpdate
from ..routes.auth import get_current_user
from ..models.pagination import PaginationParams, PaginatedResponse, PaginationMetadata, get_pagination_offset, create_paginated_response
from ..services.cache_service import CacheService, CacheConfig

logger = logging.getLogger(__name__)


# Purpose: User CRUD endpoints with filtering and soft-delete behavior.
router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=PaginatedResponse[UserResponse])
def list_users(
    role: Optional[str] = None,
    department: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List users with optional filters and pagination. Requires authentication."""
    try:
        # Build query
        query = db.query(User)
        if role:
            query = query.filter(User.role == role)
        if department:
            query = query.filter(User.department == department)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(like),
                    User.last_name.ilike(like),
                    User.email.ilike(like),
                    User.badge_id.ilike(like),
                )
            )
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        try:
            sort_field = getattr(User, params.sort_by, User.created_at)
            if params.sort_order == "asc":
                query = query.order_by(sort_field.asc())
            else:
                query = query.order_by(sort_field.desc())
        except AttributeError:
            query = query.order_by(User.created_at.desc())
        
        # Apply pagination
        offset = get_pagination_offset(params.page, params.page_size)
        users = query.offset(offset).limit(params.page_size).all()
        
        # Build response
        total_pages = ceil(total / params.page_size) if params.page_size > 0 else 0
        response = PaginatedResponse(
            data=users,
            pagination=PaginationMetadata(
                page=params.page,
                page_size=params.page_size,
                total=total,
                total_pages=total_pages,
                has_next=params.page < total_pages,
                has_prev=params.page > 1
            )
        )
        
        return response
    except Exception as exc:
        logger.error(f"Error listing users: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new user with unique badge_id and email. Requires authentication."""
    try:
        if db.query(User).filter(User.badge_id == user_in.badge_id).first():
            raise HTTPException(status_code=422, detail="badge_id already exists")
        if db.query(User).filter(User.email == user_in.email).first():
            raise HTTPException(status_code=422, detail="email already exists")

        user = User(**user_in.model_dump())
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Invalidate users cache
        CacheService.invalidate("users:*")
        
        return user
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single user by id. Requires authentication."""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user fields. Requires authentication."""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        update_data = user_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)

        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Invalidate users cache
        CacheService.invalidate("users:*")
        
        return user
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/{user_id}", response_model=UserResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a user by setting is_active to False. Requires authentication."""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.is_active = False
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Invalidate users cache
        CacheService.invalidate("users:*")
        
        return user
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
