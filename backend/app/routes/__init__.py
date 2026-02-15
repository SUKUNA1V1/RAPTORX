from .access import access_points_router, ml_router, router as access_router
from .alerts import router as alerts_router
from .stats import router as stats_router
from .users import router as users_router

__all__ = [
	"users_router",
	"access_router",
	"ml_router",
	"alerts_router",
	"stats_router",
	"access_points_router",
]
