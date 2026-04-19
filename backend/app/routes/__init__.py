from .access import access_points_router, router as access_router
from .alerts import router as alerts_router
from .stats import router as stats_router
from .users import router as users_router
from .explainability import explainability_router
from .admin import router as admin_router
from .auth import router as auth_router
from .devices import router as devices_router
from .websocket import router as websocket_router
from .onboarding import router as onboarding_router
from .ml import router as ml_router
from .scheduler_admin import router as scheduler_admin_router

# Purpose: Central route exports consumed by FastAPI app registration.
__all__ = [
	"users_router",
	"access_router",
	"ml_router",
	"alerts_router",
	"stats_router",
	"access_points_router",
	"explainability_router",
	"admin_router",
	"auth_router",
	"devices_router",
	"websocket_router",
	"onboarding_router",
	"scheduler_admin_router",
]
