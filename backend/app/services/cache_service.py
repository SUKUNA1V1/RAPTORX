"""
Redis-based caching service for database query results.

Provides transparent caching for frequent queries with automatic TTL management
and cache invalidation on data updates.
"""

import redis
import json
import logging
import os
from functools import wraps
from datetime import timedelta
from typing import Any, Optional, Callable
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class CacheConfig:
    """Redis cache configuration."""
    
    ENABLED = os.getenv("REDIS_CACHE_ENABLED", "true").lower() == "true"
    HOST = os.getenv("REDIS_HOST", "localhost")
    PORT = int(os.getenv("REDIS_PORT", 6379))
    DB = int(os.getenv("REDIS_DB", 0))
    PASSWORD = os.getenv("REDIS_PASSWORD", None)
    
    # Default TTL values
    TTL_SHORT = timedelta(minutes=5)      # Access logs, recent data
    TTL_MEDIUM = timedelta(minutes=15)    # User statistics
    TTL_LONG = timedelta(hours=1)         # Reference data
    TTL_VERYLONG = timedelta(hours=6)     # Rarely changing data


# Redis connection pool
_redis_client = None


def get_redis_client() -> redis.Redis:
    """Get or create Redis client singleton."""
    global _redis_client
    
    if _redis_client is not None:
        return _redis_client
    
    if not CacheConfig.ENABLED:
        logger.info("Redis caching disabled")
        return None
    
    try:
        _redis_client = redis.Redis(
            host=CacheConfig.HOST,
            port=CacheConfig.PORT,
            db=CacheConfig.DB,
            password=CacheConfig.PASSWORD,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_keepalive=True,
            health_check_interval=30
        )
        # Test connection
        _redis_client.ping()
        logger.info(f"Redis connected: {CacheConfig.HOST}:{CacheConfig.PORT}")
        return _redis_client
    except Exception as e:
        logger.warning(f"Failed to connect to Redis: {e}. Caching disabled.")
        _redis_client = None
        return None


class CacheService:
    """Redis-based caching service."""
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """
        Retrieve cached value.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        if not CacheConfig.ENABLED:
            return None
            
        try:
            client = get_redis_client()
            if not client:
                return None
                
            value = client.get(key)
            if value:
                logger.debug(f"Cache hit: {key}")
                return json.loads(value)
            logger.debug(f"Cache miss: {key}")
            return None
        except Exception as e:
            logger.warning(f"Cache get failed for {key}: {e}")
            return None
    
    @staticmethod
    def set(key: str, value: Any, ttl: timedelta = None) -> bool:
        """
        Store value in cache with TTL.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live (default: TTL_MEDIUM)
            
        Returns:
            True if successful, False otherwise
        """
        if not CacheConfig.ENABLED:
            return False
        
        if ttl is None:
            ttl = CacheConfig.TTL_MEDIUM
            
        try:
            client = get_redis_client()
            if not client:
                return False
                
            client.setex(
                key,
                int(ttl.total_seconds()),
                json.dumps(value)
            )
            logger.debug(f"Cache set: {key} (TTL: {ttl.total_seconds()}s)")
            return True
        except Exception as e:
            logger.warning(f"Cache set failed for {key}: {e}")
            return False
    
    @staticmethod
    def delete(key: str) -> bool:
        """
        Delete a cache key.
        
        Args:
            key: Cache key
            
        Returns:
            True if successful
        """
        if not CacheConfig.ENABLED:
            return False
            
        try:
            client = get_redis_client()
            if not client:
                return False
                
            deleted = client.delete(key)
            if deleted:
                logger.debug(f"Cache deleted: {key}")
            return bool(deleted)
        except Exception as e:
            logger.warning(f"Cache delete failed for {key}: {e}")
            return False
    
    @staticmethod
    def invalidate(pattern: str) -> int:
        """
        Invalidate all keys matching pattern (e.g., "access_logs:*").
        
        Args:
            pattern: Redis key pattern
            
        Returns:
            Number of keys invalidated
        """
        if not CacheConfig.ENABLED:
            return 0
            
        try:
            client = get_redis_client()
            if not client:
                return 0
                
            keys = client.keys(pattern)
            if keys:
                count = client.delete(*keys)
                logger.info(f"Invalidated {count} cache keys: {pattern}")
                return count
            return 0
        except Exception as e:
            logger.warning(f"Cache invalidation failed for {pattern}: {e}")
            return 0
    
    @staticmethod
    def clear_all() -> bool:
        """Clear entire cache database."""
        if not CacheConfig.ENABLED:
            return False
            
        try:
            client = get_redis_client()
            if not client:
                return False
                
            client.flushdb()
            logger.info("Cache cleared")
            return True
        except Exception as e:
            logger.warning(f"Cache clear failed: {e}")
            return False
    
    @staticmethod
    def get_stats() -> dict:
        """Get cache statistics."""
        if not CacheConfig.ENABLED:
            return {"status": "disabled"}
            
        try:
            client = get_redis_client()
            if not client:
                return {"status": "unavailable"}
                
            info = client.info()
            return {
                "status": "healthy",
                "memory_used_mb": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "evicted_keys": info.get("evicted_keys"),
                "keyspace": info.get("db" + str(CacheConfig.DB), {})
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}


def cache_result(
    ttl: timedelta = None,
    key_prefix: str = None
) -> Callable:
    """
    Decorator for caching function results.
    
    Args:
        ttl: Time to live (default: TTL_MEDIUM)
        key_prefix: Custom cache key prefix (default: function name)
        
    Example:
        @cache_result(ttl=CacheConfig.TTL_SHORT)
        async def get_access_logs(skip: int, limit: int):
            return db.query(AccessLog).offset(skip).limit(limit).all()
    """
    if ttl is None:
        ttl = CacheConfig.TTL_MEDIUM
    
    def decorator(func: Callable) -> Callable:
        prefix = key_prefix or func.__name__
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{prefix}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            # Try to get from cache
            cached = CacheService.get(cache_key)
            if cached is not None:
                return cached
            
            # Compute result
            result = await func(*args, **kwargs)
            
            # Store in cache
            CacheService.set(cache_key, result, ttl)
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{prefix}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            # Try to get from cache
            cached = CacheService.get(cache_key)
            if cached is not None:
                return cached
            
            # Compute result
            result = func(*args, **kwargs)
            
            # Store in cache
            CacheService.set(cache_key, result, ttl)
            return result
        
        # Return appropriate wrapper
        if hasattr(func, "__await__"):
            return async_wrapper
        return sync_wrapper
    
    return decorator


@contextmanager
def cache_context(key_pattern: str):
    """
    Context manager for invalidating cache on exit.
    
    Usage:
        with cache_context("access_logs:*"):
            db.add(new_log)
            db.commit()
            # Cache automatically invalidated on exit
    """
    try:
        yield
    finally:
        CacheService.invalidate(key_pattern)
