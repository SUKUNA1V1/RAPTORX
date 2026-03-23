#!/usr/bin/env python3
"""
RaptorX Quick Starter
====================
Simplified interactive pipeline runner with step-by-step control.
Use this if you want to run individual steps or pause between stages.
"""

import subprocess
import sys
import os
from pathlib import Path
from typing import Optional

# Ensure UTF-8 encoding on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Ensure we're running from workspace root
os.chdir(Path(__file__).parent.parent)


class QuickStarter:
    """Interactive pipeline starter with step-by-step control."""

    def __init__(self):
        self.steps = [
            {
                "num": 1,
                "name": "Generate Data",
                "script": "scripts/generate_data_fixed.py",
                "description": "Creates 500k synthetic access records with 500 users, realistic patterns",
                "timeout": 600
            },
            {
                "num": 2,
                "name": "Prepare Data",
                "script": "scripts/explore_and_prepare.py",
                "description": "Loads, analyzes, scales, and splits training data",
                "timeout": 300
            },
            {
                "num": 3,
                "name": "Train Isolation Forest",
                "script": "scripts/train_isolation_forest.py",
                "description": "Trains anomaly detection using isolation trees",
                "timeout": 600
            },
            {
                "num": 4,
                "name": "Train Autoencoder",
                "script": "scripts/train_autoencoder.py",
                "description": "Trains reconstruction-based anomaly detector",
                "timeout": 900
            },
            {
                "num": 5,
                "name": "Build Ensemble",
                "script": "scripts/compare_and_ensemble.py",
                "description": "Compares models and creates weighted ensemble",
                "timeout": 600
            },
            {
                "num": 6,
                "name": "Tune Thresholds",
                "script": "scripts/retune_threshold.py",
                "description": "Optimizes decision thresholds on validation set",
                "timeout": 300
            },
            {
                "num": 7,
                "name": "Quick Test",
                "script": "scripts/quick_test.py",
                "description": "Validates model with quick precision/recall test",
                "timeout": 120
            },
            {
                "num": 8,
                "name": "Thread Safety Test",
                "script": "scripts/test_thread_safety.py",
                "description": "Verifies concurrent inference is thread-safe",
                "timeout": 300
            },
            {
                "num": 9,
                "name": "Full System Validation",
                "script": "scripts/validate_system.py",
                "description": "Complete system validation and artifact verification",
                "timeout": 300
            }
        ]

    def print_banner(self):
        """Print welcome banner."""
        print("\n" + "=" * 80)
        print("  RAPTORX ML PIPELINE QUICK STARTER".center(80))
        print("=" * 80)
        print()
        print("  This tool runs the complete ML pipeline with interactive control.")
        print("  Run all steps automatically, or pause between stages for inspection.")
        print()

    def show_menu(self):
        """Display main menu."""
        print("\n" + "-" * 80)
        print("PIPELINE OPTIONS:".ljust(40) + "")
        print("-" * 80)
        print("  1) Run ALL steps automatically (recommended for first run)")
        print("  2) Run steps interactively (pause after each step)")
        print("  3) Run a single step (choose specific step)")
        print("  4) Verify existing models only (skip training)")
        print("  5) Show pipeline details")
        print("  6) Exit")
        print()

    def show_steps(self):
        """Show available steps."""
        print("\n" + "-" * 80)
        print("AVAILABLE STEPS:".ljust(40) + "")
        print("-" * 80)
        for step in self.steps:
            print(f"  [{step['num']}] {step['name']:30s} - {step['description']}")
        print()

    def run_step(self, step: dict) -> bool:
        """Run a single step."""
        print(f"\n{'='*80}")
        print(f"  RUNNING: {step['name'].upper()}")
        print(f"{'='*80}")
        print(f"  Script: {step['script']}")
        print(f"  Description: {step['description']}")
        print(f"{'='*80}\n")

        if not Path(step['script']).exists():
            print(f"✗ ERROR: Script not found: {step['script']}")
            return False

        try:
            result = subprocess.run(
                [sys.executable, step['script']],
                timeout=step['timeout'],
                cwd="."
            )
            
            if result.returncode == 0:
                print(f"\n✓ {step['name']} completed successfully")
                return True
            else:
                print(f"\n✗ {step['name']} failed with exit code {result.returncode}")
                return False
                
        except subprocess.TimeoutExpired:
            print(f"\n✗ {step['name']} exceeded timeout ({step['timeout']}s)")
            return False
        except Exception as e:
            print(f"\n✗ {step['name']} raised exception: {str(e)}")
            return False

    def run_all_steps(self):
        """Run all steps automatically."""
        print("\n" + "=" * 80)
        print("  RUNNING FULL PIPELINE (ALL STEPS)".center(80))
        print("=" * 80)
        
        passed = 0
        failed = 0
        
        for step in self.steps:
            if self.run_step(step):
                passed += 1
            else:
                failed += 1
                if passed + failed < len(self.steps):
                    print("\nContinuing with next step...")

        self.print_results(passed, failed)

    def run_interactive(self):
        """Run steps with interactive pauses."""
        print("\n" + "=" * 80)
        print("  RUNNING PIPELINE (INTERACTIVE MODE)".center(80))
        print("=" * 80)
        
        passed = 0
        failed = 0
        
        for i, step in enumerate(self.steps, 1):
            if self.run_step(step):
                passed += 1
            else:
                failed += 1
            
            if i < len(self.steps):
                print()
                choice = input(f"Press ENTER to continue to step {i+1}, or 'q' to quit: ").strip().lower()
                if choice == 'q':
                    print("Pipeline paused by user")
                    break

        self.print_results(passed, failed)

    def run_single_step(self):
        """Let user choose and run a single step."""
        self.show_steps()
        
        try:
            choice = int(input("Enter step number (1-9): ").strip())
            
            step = next((s for s in self.steps if s['num'] == choice), None)
            if not step:
                print("✗ Invalid step number")
                return
            
            if self.run_step(step):
                print(f"\n✓ Step {step['num']} ({step['name']}) completed")
            else:
                print(f"\n✗ Step {step['num']} ({step['name']}) failed")
                
        except ValueError:
            print("✗ Invalid input")

    def verify_artifacts(self):
        """Verify existing models without retraining."""
        print("\n" + "=" * 80)
        print("  VERIFYING EXISTING MODELS".center(80))
        print("=" * 80)
        
        artifacts = [
            ("data/processed/train_scaled.csv", "Training dataset"),
            ("data/processed/test_scaled.csv", "Test dataset"),
            ("ml/models/isolation_forest.pkl", "Isolation Forest model"),
            ("ml/models/autoencoder.keras", "Autoencoder model"),
            ("ml/models/scaler_13.pkl", "Feature scaler"),
            ("ml/models/current.json", "Model registry"),
        ]
        
        found = 0
        missing = 0
        
        print()
        for path, description in artifacts:
            if Path(path).exists():
                size = Path(path).stat().st_size
                print(f"  ✓ {description:30s} {path} ({size:,} bytes)")
                found += 1
            else:
                print(f"  ✗ {description:30s} {path} [MISSING]")
                missing += 1
        
        print()
        print(f"Summary: {found} artifacts found, {missing} missing")
        
        if missing == 0:
            print("\n✓ All models are ready for backend testing!")
        else:
            print(f"\n✗ Run the pipeline to generate {missing} missing artifact(s)")

    def print_results(self, passed: int, failed: int) -> None:
        """Print pipeline results."""
        total = passed + failed
        print("\n" + "=" * 80)
        print("  PIPELINE RESULTS".center(80))
        print("=" * 80)
        print(f"\n  Total steps:   {total}")
        print(f"  Passed:        {passed}")
        print(f"  Failed:        {failed}")
        
        if failed == 0:
            print("\n  ✓ Pipeline completed successfully!")
            print("\n  Next steps:")
            print("    1. Run backend:   cd backend && uvicorn app.main:app --reload --port 8000")
            print("    2. Run frontend:  cd frontend && npm run dev")
            print("    3. Open browser:  http://localhost:3000")
        else:
            print(f"\n  ✗ Pipeline had {failed} failure(s)")
            print("    Check the output above for error details")
        
        print()

    def run(self):
        """Main interactive loop."""
        # Ensure environment is set up
        os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
        os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
        
        # Create directories
        Path("data/processed").mkdir(parents=True, exist_ok=True)
        Path("ml/models").mkdir(parents=True, exist_ok=True)
        Path("ml/results").mkdir(parents=True, exist_ok=True)
        
        self.print_banner()
        
        while True:
            self.show_menu()
            
            try:
                choice = input("Enter choice (1-6): ").strip()
                
                if choice == "1":
                    self.run_all_steps()
                elif choice == "2":
                    self.run_interactive()
                elif choice == "3":
                    self.run_single_step()
                elif choice == "4":
                    self.verify_artifacts()
                elif choice == "5":
                    self.show_steps()
                elif choice == "6":
                    print("\nGoodbye!")
                    return 0
                else:
                    print("✗ Invalid choice")
                    
            except KeyboardInterrupt:
                print("\n\nExiting...")
                return 1
            except Exception as e:
                print(f"✗ Error: {str(e)}")


def main():
    starter = QuickStarter()
    return starter.run()


if __name__ == "__main__":
    sys.exit(main())
