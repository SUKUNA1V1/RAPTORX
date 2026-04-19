"""
Retraining Pipeline for RaptorX

Used for automatic model retraining every 40 days using only REAL production data
from access logs, NOT generated synthetic data.

Steps:
  1. Load real access logs from database
  2. Prepare data (scale and split)
  3. Train Isolation Forest on real data
  4. Train Autoencoder on real data
  5. Create ensemble with real data validation
  6. Retune thresholds on real data
"""

import subprocess
import sys
import os
from pathlib import Path
from datetime import datetime

# Ensure UTF-8 encoding on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Ensure we're running from workspace root
os.chdir(Path(__file__).parent.parent)


def run_retrain_pipeline(
    db_session,
    org_id: int = None,
    output_dir: str = "ml/models"
) -> bool:
    """
    Run retraining pipeline using REAL DATA from database.
    
    This is called every 40 days by the auto-retrain scheduler.
    It uses only production access logs, NOT generated synthetic data.
    
    Args:
        db_session: SQLAlchemy database session
        org_id: Organization ID (optional, for multi-tenant)
        output_dir: Where to save trained models
    
    Returns:
        True if successful, False otherwise
    """
    print("=" * 80)
    print("RETRAINING PIPELINE - USING REAL PRODUCTION DATA")
    print("=" * 80)
    print()
    
    try:
        # Step 1: Load real access logs from database
        print("STEP 1: Loading real access logs from database...")
        print("-" * 80)
        
        from scripts.load_retraining_data import load_real_access_logs_from_db, prepare_retraining_data
        
        df = load_real_access_logs_from_db(db_session, org_id=org_id)
        print()
        
        # Step 2: Prepare data
        print("STEP 2: Preparing retraining data (scale and split)...")
        print("-" * 80)
        
        os.makedirs("data/processed", exist_ok=True)
        train_path, test_path = prepare_retraining_data(df)
        print()
        
        # Step 3-6: Run training scripts
        steps = [
            (3, "Train Isolation Forest", "scripts/train_isolation_forest_retrain.py", None),
            (4, "Train Autoencoder", "scripts/train_autoencoder_retrain.py", None),
            (5, "Create Ensemble", "scripts/compare_and_ensemble_retrain.py", None),
            (6, "Retune Thresholds", "scripts/retune_threshold_retrain.py", None),
        ]
        
        for step_num, title, script, timeout in steps:
            print(f"STEP {step_num}: {title}...")
            print("-" * 80)
            
            try:
                result = subprocess.run(
                    [sys.executable, script],
                    capture_output=False,
                    text=True,
                    timeout=timeout,
                    cwd=Path(__file__).parent.parent,
                    env={**os.environ, "RETRAIN_MODE": "true"}
                )
                
                if result.returncode != 0:
                    print(f"✗ Step {step_num} failed: {title}")
                    return False
                
                print(f"✓ Step {step_num} completed: {title}")
                print()
            
            except subprocess.TimeoutExpired:
                print(f"✗ Step {step_num} timed out: {title}")
                return False
            except Exception as e:
                print(f"✗ Error in step {step_num}: {str(e)}")
                return False
        
        print("=" * 80)
        print("✓ RETRAINING COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print()
        print("Models have been retrained on REAL production data:")
        print(f"  - Isolation Forest retrained")
        print(f"  - Autoencoder retrained")
        print(f"  - Ensemble updated")
        print(f"  - Thresholds optimized")
        print()
        print("Next auto-retrain scheduled for: 40 days from now")
        print()
        
        return True
    
    except ImportError as e:
        print(f"✗ Import error: {str(e)}")
        print("  Make sure you're running from the workspace root")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("This module is meant to be imported and called by the scheduler")
    print("Example usage:")
    print("  from scripts.retrain_pipeline import run_retrain_pipeline")
    print("  success = run_retrain_pipeline(db_session, org_id=1)")
