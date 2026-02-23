#!/usr/bin/env python3
"""
RaptorX Unified Startup Menu
=============================
Menu-driven interface for all RaptorX operations.
Run pipeline, verify models, start backend/frontend, view documentation.

Usage:
    python startup_menu.py
"""

import subprocess
import sys
from pathlib import Path

# Run the startup menu script from scripts/
startup_script = Path(__file__).parent / "scripts" / "startup.py"
result = subprocess.run([sys.executable, str(startup_script)])
sys.exit(result.returncode)
