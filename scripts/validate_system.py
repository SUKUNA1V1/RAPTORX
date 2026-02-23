#!/usr/bin/env python3
"""
RAPTORX System Validation Suite
================================
Verifies all production-hardening improvements are working correctly.
Run this after deployment to confirm system health.
"""

import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime

def print_section(title):
    """Print formatted section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def check_file_exists(path, description):
    """Check if a file exists and report status."""
    exists = Path(path).exists()
    status = "[OK]" if exists else "[MISSING]"
    print(f"  {status}: {description}")
    print(f"    Path: {path}")
    if exists:
        size = Path(path).stat().st_size
        print(f"    Size: {size:,} bytes")
    return exists

def run_test(script_name, description):
    """Run a test script and report results."""
    print(f"\n  Testing: {description}")
    print(f"  Script: {script_name}")
    try:
        result = subprocess.run(
            [".venv/Scripts/python.exe", script_name],
            capture_output=True,
            text=True,
            timeout=180
        )
        if result.returncode == 0:
            # Extract key metrics from stdout
            lines = result.stdout.split('\n')
            for line in lines:
                if 'Precision' in line or 'Recall' in line or 'F1' in line or 'PASSED' in line:
                    print(f"    {line.strip()}")
            print(f"  Status: [PASSED]")
            return True
        else:
            print(f"  Status: [FAILED]")
            print(f"  Error: {result.stderr[:200]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"  Status: [TIMEOUT]")
        return False
    except Exception as e:
        print(f"  Status: [ERROR] - {str(e)}")
        return False

def main():
    print(f"\n{'*'*60}")
    print(f"*  RAPTORX PRODUCTION VALIDATION SUITE")
    print(f"*  Timestamp: {datetime.now().isoformat()}")
    print(f"{'*'*60}")

    results = {}
    
    # ========== ARTIFACT VERIFICATION ==========
    print_section("1. ARTIFACT VERIFICATION")
    
    artifacts = [
        ("ml/models/scaler_13.pkl", "13-feature scaler (for models)"),
        ("ml/models/scaler_19.pkl", "19-feature scaler (for analytics)"),
        ("ml/models/isolation_forest.pkl", "Isolation Forest model"),
        ("ml/models/autoencoder.keras", "Autoencoder model"),
        ("ml/models/ensemble_config.pkl", "Ensemble configuration"),
    ]
    
    artifact_ok = all(check_file_exists(f, d) for f, d in artifacts)
    results['artifacts'] = artifact_ok
    
    # ========== CODE VERIFICATION ==========
    print_section("2. CODE VERIFICATION")
    
    code_files = [
        ("model_registry.py", "Model versioning registry"),
        ("threshold_utils.py", "Threshold resolution helper"),
        ("decision_engine.py", "Standalone decision engine"),
        ("backend/app/services/decision_engine.py", "Backend decision engine"),
    ]
    
    code_ok = all(check_file_exists(f, d) for f, d in code_files)
    results['code_files'] = code_ok
    
    # ========== AUDIT TRAIL ==========
    print_section("3. AUDIT TRAIL VERIFICATION")
    
    audit_exists = check_file_exists("logs/access_decisions_audit.log", "Audit log file")
    if audit_exists:
        audit_path = Path("logs/access_decisions_audit.log")
        audit_size = audit_path.stat().st_size
        # Try to parse first line as JSON
        with open(audit_path, 'r') as f:
            first_line = f.readline()
            try:
                entry = json.loads(first_line)
                print(f"  [VALID] JSON: First audit entry parsed successfully")
                print(f"    Event Type: {entry.get('event_type')}")
                print(f"    Decision: {entry.get('decision')}")
                print(f"    Risk Score: {entry.get('risk_score'):.4f}")
                results['audit_valid'] = True
            except json.JSONDecodeError:
                print(f"  [INVALID] JSON: First audit entry is not valid JSON")
                results['audit_valid'] = False
    else:
        results['audit_valid'] = False
    
    results['audit_exists'] = audit_exists
    
    # ========== QUICK VALIDATION TESTS ==========
    print_section("4. QUICK VALIDATION TESTS")
    
    quick_test_ok = run_test("quick_test.py", "Quick F1/Precision/Recall check")
    results['quick_test'] = quick_test_ok
    
    overfitting_ok = run_test("overfitting_check.py", "Overfitting diagnosis (train/test gap)")
    results['overfitting_check'] = overfitting_ok
    
    # ========== THREAD SAFETY TEST ==========
    print_section("5. THREAD SAFETY VALIDATION")
    
    thread_safety_ok = run_test("test_thread_safety.py", "Concurrent access (220 decisions across 26 threads)")
    results['thread_safety'] = thread_safety_ok
    
    # ========== SUMMARY ==========
    print_section("VALIDATION SUMMARY")
    
    all_checks = [
        ("Artifact Availability", artifact_ok),
        ("Code Files Present", code_ok),
        ("Audit Logging Enabled", audit_exists and results.get('audit_valid', False)),
        ("Quick Test Passed", quick_test_ok),
        ("Overfitting Check Passed", overfitting_ok),
        ("Thread Safety Verified", thread_safety_ok),
    ]
    
    passed = sum(1 for _, ok in all_checks if ok)
    total = len(all_checks)
    
    for name, ok in all_checks:
        status = "[PASS]" if ok else "[FAIL]"
        print(f"  {status}: {name}")
    
    print(f"\n  Overall Score: {passed}/{total} checks passed")
    
    if passed == total:
        print(f"\n  [SUCCESS] SYSTEM READY FOR PRODUCTION")
        print(f"  All hardening improvements validated successfully!")
        print(f"  Thread safety verified for concurrent FastAPI requests.")
        return 0
    else:
        print(f"\n  [WARNING] {total - passed} check(s) failed")
        print(f"  Review errors above and resolve before deployment")
        return 1

if __name__ == "__main__":
    sys.exit(main())
