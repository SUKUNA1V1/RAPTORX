#!/usr/bin/env python
"""Simple backend startup script"""
import sys
import os

# Test imports
print("Testing imports...")

try:
    print("  - Testing redis import...")
    import redis
    print(f"    ✓ redis {redis.__version__}")
except ImportError as e:
    print(f"    ✗ redis: {e}")
    sys.exit(1)

try:
    print("  - Testing fastapi import...")
    import fastapi
    print(f"    ✓ fastapi {fastapi.__version__}")
except ImportError as e:
    print(f"    ✗ fastapi: {e}")
    sys.exit(1)

try:
    print("  - Testing uvicorn import...")
    import uvicorn
    print(f"    ✓ uvicorn")
except ImportError as e:
    print(f"    ✗ uvicorn: {e}")
    sys.exit(1)

print("\nAll imports OK. Starting server...\n")

# Start uvicorn
uvicorn.run(
    "app.main:app",
    host="0.0.0.0",
    port=8000,
    reload=False,  # Disable reload to avoid subprocess issues
)
