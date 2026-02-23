#!/usr/bin/env python3
"""
RaptorX ML Pipeline Interactive Launcher
========================================
Convenient wrapper to run the interactive ML pipeline.
Step-by-step control with pauses and individual step selection.

Usage:
    python pipeline_interactive.py
"""

import subprocess
import sys
from pathlib import Path

# Run the interactive pipeline script from scripts/
pipeline_script = Path(__file__).parent / "scripts" / "run_pipeline_interactive.py"
result = subprocess.run([sys.executable, str(pipeline_script)])
sys.exit(result.returncode)
