from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routes import access_points_router, access_router, alerts_router, ml_router, stats_router, users_router


app = FastAPI(title="AI Access Control System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": str(exc)})


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
