"""API response time tracking and performance middleware."""

import time
import logging
from typing import Dict, List, Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Global storage for API metrics
api_metrics: Dict[str, List[Dict]] = {}
endpoint_stats: Dict[str, Dict] = {}


class APIPerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to track API endpoint response times and status codes."""

    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request and track metrics."""
        start_time = time.time()
        endpoint = f"{request.method} {request.url.path}"

        try:
            response = await call_next(request)
            elapsed_time = time.time() - start_time

            # Track the request
            track_api_call(endpoint, response.status_code, elapsed_time)
            
            # Log slow endpoints
            if elapsed_time > 0.5:  # 500ms threshold
                logger.warning(
                    f"Slow API: {endpoint} took {elapsed_time*1000:.2f}ms "
                    f"(status: {response.status_code})"
                )

            return response
        except Exception as exc:
            elapsed_time = time.time() - start_time
            track_api_call(endpoint, 500, elapsed_time)
            logger.error(f"API Error: {endpoint} failed after {elapsed_time*1000:.2f}ms")
            raise


def track_api_call(endpoint: str, status_code: int, duration: float) -> None:
    """Track individual API call metrics."""
    # Store recent calls (keep last 50 per endpoint)
    if endpoint not in api_metrics:
        api_metrics[endpoint] = []

    api_metrics[endpoint].append(
        {
            "timestamp": datetime.utcnow().isoformat(),
            "status_code": status_code,
            "duration_ms": round(duration * 1000, 2),
        }
    )

    # Keep only recent calls
    api_metrics[endpoint] = api_metrics[endpoint][-50:]

    # Update aggregate statistics
    if endpoint not in endpoint_stats:
        endpoint_stats[endpoint] = {
            "total_calls": 0,
            "successful_calls": 0,
            "failed_calls": 0,
            "total_time": 0.0,
            "min_time": float("inf"),
            "max_time": 0.0,
            "avg_time": 0.0,
            "status_codes": {},
        }

    stats = endpoint_stats[endpoint]
    stats["total_calls"] += 1
    stats["total_time"] += duration
    stats["min_time"] = min(stats["min_time"], duration)
    stats["max_time"] = max(stats["max_time"], duration)
    stats["avg_time"] = stats["total_time"] / stats["total_calls"]

    if status_code < 400:
        stats["successful_calls"] += 1
    else:
        stats["failed_calls"] += 1

    status_key = str(status_code)
    stats["status_codes"][status_key] = stats["status_codes"].get(status_key, 0) + 1


def get_api_performance_stats() -> Dict:
    """Get aggregated API performance statistics."""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": endpoint_stats,
        "recent_calls": {
            k: v[-10:] for k, v in api_metrics.items()
        },  # Last 10 calls per endpoint
    }


def reset_api_metrics() -> None:
    """Reset all API metrics (use for testing or periodic cleanup)."""
    global api_metrics, endpoint_stats
    api_metrics.clear()
    endpoint_stats.clear()
