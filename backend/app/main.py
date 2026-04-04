from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

from .routes import (
    access_points_router,
    access_router,
    alerts_router,
    ml_router,
    stats_router,
    users_router,
    explainability_router,
    admin_router,
)
from .api_metrics import APIPerformanceMiddleware
from .logging_config import get_logger

logger = get_logger("main")


app = FastAPI(title="AI Access Control System API")

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
cors_localhost_regex = r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\\d+)?$"

# Add API performance monitoring middleware
app.add_middleware(APIPerformanceMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_localhost_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": str(exc)})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.on_event("startup")
async def startup_event():
    from app.routes.access import get_engine

    engine = get_engine()
    print(f"Decision Engine loaded: {engine.status()}")


app.include_router(users_router, prefix="/api")
app.include_router(access_router, prefix="/api")
app.include_router(access_points_router, prefix="/api")
app.include_router(ml_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(explainability_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
