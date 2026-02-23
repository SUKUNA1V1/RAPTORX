#!/usr/bin/env python3
"""
RaptorX Startup Menu
====================
Unified entry point for running the ML pipeline and starting the backend/frontend.
"""

import subprocess
import sys
import os
from pathlib import Path

# Ensure UTF-8 encoding on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Ensure we're running from workspace root
os.chdir(Path(__file__).parent.parent)


def print_header():
    """Print welcome header."""
    print("\n" + "=" * 80)
    print("  RAPTORX - UNIFIED STARTUP MENU".center(80))
    print("=" * 80)
    print()


def show_main_menu():
    """Show main menu options."""
    print("What would you like to do?")
    print()
    print("  [1] RUN FULL ML PIPELINE (Recommended)")
    print("      └─ Generates data → trains models → validates → ready for testing")
    print()
    print("  [2] RUN PIPELINE INTERACTIVELY")
    print("      └─ Step-by-step with control between stages")
    print()
    print("  [3] VERIFY EXISTING MODELS")
    print("      └─ Check if models are already trained")
    print()
    print("  [4] START BACKEND ONLY")
    print("      └─ Skip pipeline, run FastAPI backend")
    print()
    print("  [5] START FULL STACK (BACKEND + FRONTEND)")
    print("      └─ Run both in separate processes (experimental)")
    print()
    print("  [6] VIEW QUICK START GUIDE")
    print("      └─ Show detailed instructions")
    print()
    print("  [7] EXIT")
    print()


def run_full_pipeline():
    """Run the full automated pipeline."""
    print("\n" + "=" * 80)
    print("  STARTING FULL ML PIPELINE".center(80))
    print("=" * 80)
    print()
    print("  This will run all training steps automatically.")
    print("  Estimated time: 45-90 minutes")
    print()
    
    try:
        result = subprocess.run([sys.executable, "scripts/run_full_pipeline.py"])
        return result.returncode == 0
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def run_interactive_pipeline():
    """Run the interactive pipeline."""
    print("\n" + "=" * 80)
    print("  STARTING INTERACTIVE PIPELINE".center(80))
    print("=" * 80)
    print()
    
    try:
        result = subprocess.run([sys.executable, "scripts/run_pipeline_interactive.py"])
        return result.returncode == 0
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def verify_models():
    """Verify existing trained models."""
    print("\n" + "=" * 80)
    print("  VERIFYING MODELS".center(80))
    print("=" * 80)
    print()
    
    artifacts = [
        ("data/processed/train_scaled.csv", "Training dataset"),
        ("data/processed/test_scaled.csv", "Test dataset"),
        ("ml/models/isolation_forest.pkl", "Isolation Forest model"),
        ("ml/models/autoencoder.keras", "Autoencoder model"),
        ("ml/models/scaler_13.pkl", "Feature scaler"),
        ("ml/models/current.json", "Model registry"),
    ]
    
    found = 0
    missing = []
    
    print("Checking artifacts:")
    print()
    for path, description in artifacts:
        if Path(path).exists():
            size = Path(path).stat().st_size
            print(f"  ✓ {description:30s} {path}")
            print(f"    Size: {size:,} bytes")
            found += 1
        else:
            print(f"  ✗ {description:30s} [MISSING]")
            missing.append(description)
    
    print()
    print(f"Summary: {found}/{len(artifacts)} artifacts found")
    
    if not missing:
        print("\n✓ All models are ready for backend testing!")
        return True
    else:
        print(f"\n✗ Missing {len(missing)} artifact(s):")
        for m in missing:
            print(f"  - {m}")
        print("\nRun option [1] to generate these artifacts.")
        return False


def start_backend():
    """Start the backend server."""
    print("\n" + "=" * 80)
    print("  STARTING BACKEND SERVER".center(80))
    print("=" * 80)
    print()
    print("  Backend will run on http://127.0.0.1:8000")
    print("  Press Ctrl+C to stop")
    print()
    
    try:
        os.chdir("backend")
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "app.main:app",
            "--reload",
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\n✓ Backend stopped")
    except Exception as e:
        print(f"✗ Error: {str(e)}")
    finally:
        os.chdir("..")


def show_guide():
    """Show the quick start guide."""
    guide_path = Path("PIPELINE_QUICKSTART.md")
    if guide_path.exists():
        print("\n" + "=" * 80)
        print("  PIPELINE QUICK START GUIDE".center(80))
        print("=" * 80)
        print()
        with open(guide_path, "r") as f:
            print(f.read())
    else:
        print("\n✗ PIPELINE_QUICKSTART.md not found")


def start_full_stack():
    """Start backend and frontend (experimental)."""
    print("\n" + "=" * 80)
    print("  STARTING FULL STACK (EXPERIMENTAL)".center(80))
    print("=" * 80)
    print()
    print("  NOTE: This is experimental. For reliable setup, run backend and frontend")
    print("  in separate terminals manually.")
    print()
    print("  Backend: cd backend && uvicorn app.main:app --reload --port 8000")
    print("  Frontend: cd frontend && npm run dev")
    print()
    
    import threading
    import time
    
    def run_backend():
        os.chdir("backend")
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "app.main:app",
            "--reload",
            "--port", "8000"
        ])
    
    def run_frontend():
        time.sleep(5)  # Give backend time to start
        os.chdir("..")
        os.chdir("frontend")
        subprocess.run(["npm", "run", "dev"])
    
    print("  Starting backend and frontend in background...")
    
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    frontend_thread = threading.Thread(target=run_frontend, daemon=True)
    
    try:
        backend_thread.start()
        frontend_thread.start()
        
        print("  Backend starting on http://localhost:8000")
        print("  Frontend starting on http://localhost:3000")
        print("  Press Ctrl+C to stop\n")
        
        # Keep main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n✓ Stopping full stack...")


def main():
    """Main interactive menu loop."""
    print_header()
    
    # Create required directories
    Path("data/processed").mkdir(parents=True, exist_ok=True)
    Path("ml/models").mkdir(parents=True, exist_ok=True)
    Path("ml/results").mkdir(parents=True, exist_ok=True)
    Path("logs").mkdir(parents=True, exist_ok=True)
    
    while True:
        show_main_menu()
        
        try:
            choice = input("Enter choice (1-7): ").strip()
            
            if choice == "1":
                if run_full_pipeline():
                    print("\n✓ Pipeline completed successfully!")
                else:
                    print("\n✗ Pipeline failed - see above for details")
                    
            elif choice == "2":
                run_interactive_pipeline()
                
            elif choice == "3":
                verify_models()
                
            elif choice == "4":
                start_backend()
                
            elif choice == "5":
                start_full_stack()
                
            elif choice == "6":
                show_guide()
                input("\nPress ENTER to return to menu...")
                
            elif choice == "7":
                print("\nGoodbye! 👋")
                break
                
            else:
                print("\n✗ Invalid choice. Please enter 1-7.")
                
        except KeyboardInterrupt:
            print("\n\nExiting...")
            break
        except Exception as e:
            print(f"\n✗ Error: {str(e)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n✗ Fatal error: {str(e)}")
        sys.exit(1)
