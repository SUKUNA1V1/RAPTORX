"""Database performance monitoring and query statistics."""

import time
import logging
from contextlib import contextmanager
from typing import Dict, List
from datetime import datetime, timedelta
from sqlalchemy import event, Engine
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Global query statistics storage
query_stats: Dict[str, Dict] = {}
slow_queries: List[Dict] = []
SLOW_QUERY_THRESHOLD = 0.1  # 100ms


def init_query_monitoring(engine: Engine) -> None:
    """Initialize SQLAlchemy event listeners for query monitoring."""
    
    @event.listens_for(engine, "before_cursor_execute")
    def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Capture query start time."""
        conn.info.setdefault("query_start_time", []).append(time.time())

    @event.listens_for(engine, "after_cursor_execute")
    def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Log query execution time and track statistics."""
        total_time = time.time() - conn.info["query_start_time"].pop(-1)
        
        # Normalize query for statistics
        query_type = statement.split()[0].upper() if statement else "UNKNOWN"
        table_name = extract_table_name(statement)
        
        # Track statistics
        key = f"{query_type}_{table_name}"
        if key not in query_stats:
            query_stats[key] = {
                "count": 0,
                "total_time": 0.0,
                "min_time": float("inf"),
                "max_time": 0.0,
                "avg_time": 0.0,
                "query_type": query_type,
                "table_name": table_name,
            }
        
        stats = query_stats[key]
        stats["count"] += 1
        stats["total_time"] += total_time
        stats["min_time"] = min(stats["min_time"], total_time)
        stats["max_time"] = max(stats["max_time"], total_time)
        stats["avg_time"] = stats["total_time"] / stats["count"]
        
        # Flag slow queries
        if total_time > SLOW_QUERY_THRESHOLD:
            slow_queries.append({
                "timestamp": datetime.utcnow().isoformat(),
                "duration_ms": round(total_time * 1000, 2),
                "query_type": query_type,
                "table_name": table_name,
                "statement": statement[:200],  # Log first 200 chars
            })
            # Keep only last 100 slow queries
            if len(slow_queries) > 100:
                slow_queries.pop(0)
            logger.warning(
                f"Slow query detected: {query_type} on {table_name} took {total_time*1000:.2f}ms"
            )


def extract_table_name(statement: str) -> str:
    """Extract primary table name from SQL statement."""
    try:
        statement = statement.upper()
        if "FROM" in statement:
            from_idx = statement.index("FROM")
            after_from = statement[from_idx + 5:].strip()
            table = after_from.split()[0].split("(")[0]
            return table
        elif "INTO" in statement:
            into_idx = statement.index("INTO")
            after_into = statement[into_idx + 5:].strip()
            table = after_into.split()[0]
            return table
        elif "UPDATE" in statement:
            update_idx = statement.index("UPDATE")
            after_update = statement[update_idx + 6:].strip()
            table = after_update.split()[0]
            return table
    except Exception:
        pass
    return "UNKNOWN"


def get_query_statistics() -> Dict:
    """Get aggregated query performance statistics."""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "total_queries": sum(s["count"] for s in query_stats.values()),
        "queries_by_type": query_stats,
        "slow_queries_count": len(slow_queries),
        "recent_slow_queries": slow_queries[-10:],  # Last 10
    }


def reset_statistics() -> None:
    """Reset all statistics (use for testing or periodic cleanup)."""
    global query_stats, slow_queries
    query_stats.clear()
    slow_queries.clear()


@contextmanager
def time_query(label: str):
    """Context manager for timing any database operation."""
    start = time.time()
    try:
        yield
    finally:
        elapsed = time.time() - start
        logger.info(f"{label} took {elapsed*1000:.2f}ms")
