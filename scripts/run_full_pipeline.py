#!/usr/bin/env python3
"""
RaptorX Full ML Pipeline Orchestrator
======================================
Runs the complete ML pipeline from data generation through validation.
Executes all steps sequentially with detailed progress reporting.

Pipeline Steps:
  1. Generate synthetic data (500k access records)
    2. Explore and prepare data (load, scale, split)
    3. Train Isolation Forest model
    4. Train Autoencoder model
    5. Compare models and create ensemble
    6. Retune decision thresholds
    7. Quick validation test
    8. Thread-safety validation
    9. Full system validation

After completion, models are ready for backend testing.
"""

import subprocess
import sys
import os
import time
import argparse
from pathlib import Path
from datetime import datetime

# Ensure UTF-8 encoding on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Ensure we're running from workspace root
os.chdir(Path(__file__).parent.parent)


class PipelineRunner:
    """Orchestrates the full ML pipeline with error handling and progress tracking."""

    def __init__(self, mode: str = "dev"):
        self.mode = mode
        self.start_time = datetime.now()
        self.step_times = {}
        self.failed_steps = []
        self.passed_steps = []
        self.total_steps = 9

    def print_banner(self, text: str) -> None:
        """Print formatted banner section."""
        width = 80
        print("\n" + "=" * width)
        print(f"  {text.upper()}")
        print("=" * width + "\n")

    def print_step(self, step_num: int, title: str) -> None:
        """Print formatted step header."""
        print(f"\n[STEP {step_num}/{self.total_steps}] {title}")
        print("-" * 70)

    def print_substep(self, text: str) -> None:
        """Print substep info."""
        print(f"  → {text}")

    def print_progress(self, text: str) -> None:
        """Print progress message."""
        print(f"     {text}")

    def print_success(self, text: str) -> None:
        """Print success message."""
        print(f"  ✓ {text}")

    def print_error(self, text: str) -> None:
        """Print error message."""
        print(f"  ✗ {text}")

    def run_step(
        self, 
        step_num: int, 
        title: str, 
        script_path: str,
        timeout: int = None
    ) -> bool:
        """Run a pipeline step (script) and track results."""
        self.print_step(step_num, title)
        
        if not Path(script_path).exists():
            self.print_error(f"Script not found: {script_path}")
            self.failed_steps.append((step_num, title, "Script not found"))
            return False

        self.print_substep(f"Running: {script_path}")
        timeout_str = f"Timeout: {timeout} seconds" if timeout else "Timeout: NONE (unlimited)"
        self.print_substep(timeout_str)

        step_start = time.time()
        
        try:
            result = subprocess.run(
                [sys.executable, script_path],
                capture_output=False,  # Show real-time output
                text=True,
                timeout=timeout,
                cwd="."
            )

            elapsed = time.time() - step_start
            self.step_times[title] = elapsed

            if result.returncode == 0:
                self.print_success(f"{title} completed in {elapsed:.1f}s")
                self.passed_steps.append((step_num, title, elapsed))
                return True
            else:
                self.print_error(f"{title} failed with exit code {result.returncode}")
                self.failed_steps.append((step_num, title, f"Exit code {result.returncode}"))
                return False

        except subprocess.TimeoutExpired:
            self.print_error(f"{title} exceeded timeout ({timeout}s)")
            self.failed_steps.append((step_num, title, "Timeout exceeded"))
            return False
        except Exception as e:
            self.print_error(f"{title} raised exception: {str(e)}")
            self.failed_steps.append((step_num, title, str(e)))
            return False

    def verify_directory(self, path: str, description: str) -> bool:
        """Verify directory exists and report status."""
        if Path(path).exists():
            self.print_success(f"{description} exists")
            return True
        else:
            self.print_error(f"{description} not found: {path}")
            return False

    def verify_files(self, paths: list, description: str) -> bool:
        """Verify list of files exist."""
        all_exist = True
        for path in paths:
            if Path(path).exists():
                size = Path(path).stat().st_size
                self.print_progress(f"✓ {path} ({size:,} bytes)")
            else:
                self.print_progress(f"✗ {path} NOT FOUND")
                all_exist = False
        return all_exist

    def configure_environment(self) -> None:
        """Set up environment variables."""
        self.print_substep("Configuring environment variables")
        os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
        os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
        os.environ["PYTHONUNBUFFERED"] = "1"

        if self.mode == "prod-like":
            os.environ.setdefault("RAPTORX_DATA_PROFILE", "prod")
            os.environ.setdefault("RAPTORX_TARGET_ANOMALY_RATIO", "0.015")
        else:
            os.environ.setdefault("RAPTORX_DATA_PROFILE", "dev")
            os.environ.setdefault("RAPTORX_TARGET_ANOMALY_RATIO", "0.02")

        os.environ.setdefault("RAPTORX_RANDOM_SEED", "42")
        os.environ.setdefault("RAPTORX_MIN_PRECISION", "0.72")
        os.environ.setdefault("RAPTORX_MIN_RECALL", "0.80")

        self.print_progress("Environment configured")
        self.print_progress(f"Pipeline mode: {self.mode}")
        self.print_progress(f"Data profile: {os.environ['RAPTORX_DATA_PROFILE']}")
        self.print_progress(
            f"Threshold tuning target anomaly ratio: {os.environ['RAPTORX_TARGET_ANOMALY_RATIO']}"
        )
        self.print_progress(f"Random seed: {os.environ['RAPTORX_RANDOM_SEED']}")

    def verify_prerequisite_files(self) -> bool:
        """Verify required input files exist."""
        self.print_step(0, "Verification & Setup")
        self.print_substep("Checking prerequisite files")

        required_files = [
            ("scripts/generate_data_fixed.py", ["scripts/generate_data_fixed.py"]),
            ("scripts/explore_and_prepare.py", ["scripts/explore_and_prepare.py"]),
            ("scripts/train_isolation_forest.py", ["scripts/train_isolation_forest.py"]),
            ("scripts/train_autoencoder.py", ["scripts/train_autoencoder.py"]),
            ("scripts/compare_and_ensemble.py", ["scripts/compare_and_ensemble.py"]),
            ("scripts/retune_threshold.py", ["scripts/retune_threshold.py"]),
            ("scripts/quick_test.py", ["scripts/quick_test.py"]),
            ("scripts/test_thread_safety.py", ["scripts/test_thread_safety.py"]),
            ("scripts/validate_system.py", ["scripts/validate_system.py"]),
            ("scripts/model_registry.py", ["scripts/model_registry.py", "model_registry.py"]),
            ("scripts/threshold_utils.py", ["scripts/threshold_utils.py", "threshold_utils.py"]),
            ("scripts/decision_engine.py", ["scripts/decision_engine.py", "decision_engine.py"]),
            ("scripts/explainability.py", ["scripts/explainability.py", "explainability.py"]),
        ]

        all_exist = True
        for display_path, candidates in required_files:
            if any(Path(candidate).exists() for candidate in candidates):
                self.print_progress(f"✓ {display_path}")
            else:
                self.print_progress(f"✗ {display_path} NOT FOUND")
                all_exist = False

        if not all_exist:
            self.print_error("Some required files are missing!")
            return False

        self.print_success("All prerequisite files found")
        return True

    def verify_output_artifacts(self) -> bool:
        """Verify critical output artifacts after pipeline."""
        self.print_substep("Verifying output artifacts")
        
        critical_files = [
            "data/processed/train_scaled.csv",
            "data/processed/test_scaled.csv",
            "ml/models/isolation_forest.pkl",
            "ml/models/autoencoder.keras",
            "ml/models/autoencoder_config.pkl",
            "ml/models/scaler_13.pkl",
            "ml/models/current.json"
        ]

        all_exist = self.verify_files(critical_files, "Critical model artifacts")
        
        if all_exist:
            self.print_success("All critical artifacts are ready for backend")
        else:
            self.print_error("Some artifacts are missing - pipeline may have failed")
        
        return all_exist

    def run_pipeline(self) -> bool:
        """Execute the full ML pipeline."""
        self.print_banner("RaptorX Full ML Pipeline")
        
        print(f"Start time: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Working directory: {Path.cwd()}")
        
        # Step 0: Setup and verification
        self.configure_environment()
        if not self.verify_prerequisite_files():
            self.print_error("Cannot proceed: prerequisite files missing")
            return False

        # Create output directories
        Path("data/processed").mkdir(parents=True, exist_ok=True)
        Path("ml/models").mkdir(parents=True, exist_ok=True)
        Path("ml/results").mkdir(parents=True, exist_ok=True)
        Path("logs").mkdir(parents=True, exist_ok=True)

        # Run pipeline steps
        steps = [
            (1, "Generate Synthetic Data", "scripts/generate_data_fixed.py", None),
            (2, "Explore & Prepare Data", "scripts/explore_and_prepare.py", None),
            (3, "Train Isolation Forest", "scripts/train_isolation_forest.py", None),
            (4, "Train Autoencoder", "scripts/train_autoencoder.py", None),
            (5, "Compare & Ensemble", "scripts/compare_and_ensemble.py", None),
            (6, "Retune Thresholds", "scripts/retune_threshold.py", None),
            (7, "Quick Validation Test", "scripts/quick_test.py", None),
            (8, "Thread Safety Test", "scripts/test_thread_safety.py", None),
            (9, "Full System Validation", "scripts/validate_system.py", None),
        ]

        for step_num, title, script, timeout in steps:
            success = self.run_step(step_num, title, script, timeout)
            if not success:
                self.print_error(f"Pipeline stopped at step {step_num}")
                # Don't fail on optional tests - continue to verification
                if step_num >= 7:  # Tests are after critical training
                    continue
                else:
                    return False

        return True

    def print_summary(self) -> None:
        """Print execution summary."""
        end_time = datetime.now()
        total_duration = (end_time - self.start_time).total_seconds()

        self.print_banner("Pipeline Execution Summary")

        print(f"Total Duration: {total_duration:.1f}s ({total_duration/60:.1f} minutes)")
        print()

        if self.passed_steps:
            print("PASSED STEPS:")
            for step_num, title, elapsed in self.passed_steps:
                print(f"  [{step_num}] {title:40s} {elapsed:8.1f}s")
            print()

        if self.failed_steps:
            print("FAILED STEPS:")
            for step_num, title, reason in self.failed_steps:
                print(f"  [{step_num}] {title:40s} - {reason}")
            print()

        print("=" * 80)

    def print_next_steps(self, success: bool) -> None:
        """Print instructions for next steps."""
        self.print_banner("Next Steps")

        if success:
            print("✓ Pipeline completed successfully!")
            print()
            print("ML Models are now ready. To test the complete system:")
            print()
            print("1. START BACKEND:")
            print("   cd backend")
            print("   uvicorn app.main:app --reload --port 8000")
            print()
            print("2. START FRONTEND (in new terminal):")
            print("   cd frontend")
            print("   npm run dev")
            print()
            print("3. OPEN DASHBOARD:")
            print("   http://localhost:3000")
            print()
            print("4. TEST ACCESS DECISION:")
            print("   - Go to Simulator page")
            print("   - Submit access requests to test the trained ensemble models")
            print("   - Check Alerts, Logs, and ML Status pages")
            print()
            print("5. MONITOR:")
            print("   - Dashboard: system metrics and decision distribution")
            print("   - Logs: access history with risk scores")
            print("   - Alerts: anomalies detected and alert triage")
            print("   - ML Status: model health and ensemble configuration")
            return

        print("✗ Pipeline did not complete successfully")
        print()
        print("TROUBLESHOOTING:")
        print()
        for step_num, title, reason in self.failed_steps:
            print(f"  Step {step_num} ({title}): {reason}")
            print(f"    → Check the output above for more details")
            print(f"    → Verify input files exist for this step")
            print(f"    → Check available disk space and memory")
            print()

    def run(self) -> int:
        """Main entry point."""
        try:
            success = self.run_pipeline()
            
            if success:
                self.verify_output_artifacts()
            
            self.print_summary()
            self.print_next_steps(success)

            return 0 if success else 1

        except KeyboardInterrupt:
            self.print_error("Pipeline interrupted by user")
            return 1
        except Exception as e:
            self.print_error(f"Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            return 1


def main():
    """Entry point."""
    parser = argparse.ArgumentParser(description="Run the full RaptorX ML pipeline")
    parser.add_argument(
        "--mode",
        choices=["dev", "prod-like"],
        default=os.getenv("RAPTORX_PIPELINE_MODE", "dev"),
        help="dev: training-focused defaults, prod-like: low-prevalence calibration defaults",
    )
    args = parser.parse_args()

    runner = PipelineRunner(mode=args.mode)
    return runner.run()


if __name__ == "__main__":
    sys.exit(main())
