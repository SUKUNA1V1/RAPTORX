#!/usr/bin/env python3
"""Quick test of pipeline setup"""

import os
from pathlib import Path

print("=" * 80)
print("RAPTORX PIPELINE SETUP VERIFICATION")
print("=" * 80)
print()

# Check we're in right directory
cwd = Path.cwd()
print(f"Working directory: {cwd}")
print()

# Check directory structure
dirs_to_check = ["scripts", "docs", "data", "ml", "backend", "frontend", "logs"]
print("Checking directories:")
for d in dirs_to_check:
    path = cwd / d
    exists = "✓" if path.exists() else "✗"
    print(f"  {exists} {d}/")
print()

# Check critical scripts
scripts_to_check = [
    "scripts/generate_data_fixed.py",
    "scripts/load_data_to_db.py",
    "scripts/train_isolation_forest.py",
    "scripts/train_autoencoder.py",
    "scripts/compare_and_ensemble.py",
    "scripts/retune_threshold.py",
    "scripts/run_full_pipeline.py",
]
print("Checking critical scripts:")
for script in scripts_to_check:
    path = cwd / script
    exists = "✓" if path.exists() else "✗"
    print(f"  {exists} {script}")
print()

# Check core ML files
ml_files = ["decision_engine.py", "explainability.py", "model_registry.py", "threshold_utils.py"]
print("Checking core ML files:")
for f in ml_files:
    path = cwd / f
    exists = "✓" if path.exists() else "✗"
    print(f"  {exists} {f}")
print()

print("=" * 80)
print("✓ Setup verification complete")
print("=" * 80)
print()
print("To run the full pipeline:")
print("  python run_pipeline.py")
print()
