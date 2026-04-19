"""
Pagination models for list API responses.

Provides standardized pagination parameters and response structures
for consistent handling of large result sets.
"""

from pydantic import BaseModel, Field
from typing import Generic, TypeVar, List, Optional
from math import ceil

T = TypeVar('T')


class PaginationParams(BaseModel):
    """
    Standard pagination parameters for list endpoints.
    
    Usage in route:
        @app.get("/api/items")
        async def get_items(params: PaginationParams = Depends()):
            # params.page, params.page_size, params.sort_by, params.sort_order
    """
    page: int = Field(
        1,
        ge=1,
        description="Page number (1-indexed)"
    )
    page_size: int = Field(
        50,
        ge=10,
        le=500,
        description="Items per page (10-500)"
    )
    sort_by: Optional[str] = Field(
        "created_at",
        description="Sort field name"
    )
    sort_order: Optional[str] = Field(
        "desc",
        pattern="^(asc|desc)$",
        description="Sort order: asc or desc"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "page": 1,
                "page_size": 50,
                "sort_by": "created_at",
                "sort_order": "desc"
            }
        }


class PaginationMetadata(BaseModel):
    """Pagination metadata included in responses."""
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total: int = Field(..., description="Total items across all pages")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether next page exists")
    has_prev: bool = Field(..., description="Whether previous page exists")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Standard paginated response structure.
    
    Usage:
        return PaginatedResponse(
            data=items,
            page=params.page,
            page_size=params.page_size,
            total=total_count
        )
    """
    data: List[T] = Field(..., description="Items in current page")
    pagination: PaginationMetadata
    
    def __init__(
        self,
        data: List[T],
        page: int,
        page_size: int,
        total: int,
        **kwargs
    ):
        """
        Initialize paginated response.
        
        Args:
            data: List of items for current page
            page: Current page number (1-indexed)
            page_size: Items per page
            total: Total items across all pages
        """
        total_pages = ceil(total / page_size) if page_size > 0 else 0
        
        pagination = PaginationMetadata(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )
        
        super().__init__(data=data, pagination=pagination, **kwargs)


class SimplePaginatedResponse(BaseModel):
    """
    Simple paginated response for any data type (when Generic not possible).
    
    Usage:
        response = SimplePaginatedResponse(
            data=items,
            page=1,
            page_size=50,
            total=1000
        )
    """
    data: List[dict] = Field(..., description="Items in current page")
    pagination: PaginationMetadata
    
    def __init__(
        self,
        data: List[dict],
        page: int,
        page_size: int,
        total: int,
        **kwargs
    ):
        total_pages = ceil(total / page_size) if page_size > 0 else 0
        
        pagination = PaginationMetadata(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )
        
        super().__init__(data=data, pagination=pagination, **kwargs)


def get_pagination_offset(page: int, page_size: int) -> int:
    """
    Calculate database query offset from page number.
    
    Args:
        page: Page number (1-indexed)
        page_size: Items per page
        
    Returns:
        Offset for database query (0-indexed)
    """
    if page < 1:
        page = 1
    return (page - 1) * page_size
