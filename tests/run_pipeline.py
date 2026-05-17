#!/usr/bin/env python3
"""
RaptorX ML Pipeline Launcher
============================
Convenient wrapper to run the full ML pipeline.
Executes all training stages from data generation to validation.

Usage:
    python run_pipeline.py
"""

import subprocess
import sys
from pathlib import Path

# Run the full pipeline script from scripts/
pipeline_script = Path(__file__).parent / "scripts" / "run_full_pipeline.py"
result = subprocess.run([sys.executable, str(pipeline_script), *sys.argv[1:]])
sys.exit(result.returncode)
