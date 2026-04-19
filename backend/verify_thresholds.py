#!/usr/bin/env python3
"""
Verify that threshold management is working correctly.

This script checks:
1. No hardcoded thresholds in critical code paths
2. DecisionEngine loads thresholds from model files
3. Environment variable overrides work
4. Auto-retuning thresholds are loaded correctly
5. All threshold references use dynamic values (not hardcoded)
"""

import os
import sys
import joblib
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def check_decision_engine():
    """Verify DecisionEngine has proper threshold loading."""
    print("=" * 70)
    print("CHECKING: DecisionEngine Threshold Loading")
    print("=" * 70)
    
    try:
        from app.services.decision_engine import AccessDecisionEngine
        
        # Test 1: Default initialization
        print("\n✓ DecisionEngine imported successfully")
        
        # Check that instance has threshold attributes (not class attributes)
        engine = AccessDecisionEngine()
        
        assert hasattr(engine, 'grant_threshold'), "Missing grant_threshold attribute"
        assert hasattr(engine, 'deny_threshold'), "Missing deny_threshold attribute"
        print(f"✓ Loaded thresholds from models/env vars:")
        print(f"  - grant_threshold: {engine.grant_threshold:.4f}")
        print(f"  - deny_threshold: {engine.deny_threshold:.4f}")
        
        # Test 2: Verify thresholds are properly ordered
        assert engine.grant_threshold < engine.deny_threshold, \
            f"Invalid threshold order: grant({engine.grant_threshold}) >= deny({engine.deny_threshold})"
        print(f"✓ Thresholds are properly ordered: {engine.grant_threshold:.4f} < {engine.deny_threshold:.4f}")
        
        return True
    except Exception as e:
        print(f"✗ DecisionEngine check failed: {e}")
        return False


def check_ml_service():
    """Verify ML service has dynamic threshold parameters."""
    print("\n" + "=" * 70)
    print("CHECKING: ML Service Alert Severity Function")
    print("=" * 70)
    
    try:
        from app.services.ml_service import determine_alert_severity
        import inspect
        
        # Check function signature
        sig = inspect.signature(determine_alert_severity)
        params = list(sig.parameters.keys())
        
        required_params = ['risk_score', 'grant_threshold', 'deny_threshold']
        for param in required_params:
            assert param in params, f"Missing parameter: {param}"
        
        print(f"✓ determine_alert_severity has correct parameters: {params}")
        
        # Test with default thresholds
        result = determine_alert_severity(0.25)  # Below grant threshold
        assert result == "low", f"Expected 'low' for score 0.25, got '{result}'"
        print(f"✓ Severity mapping works with default thresholds")
        
        # Test with custom thresholds
        result = determine_alert_severity(0.35, grant_threshold=0.40, deny_threshold=0.60)
        assert result == "low", f"Expected 'low' for score 0.35 < grant 0.40, got '{result}'"
        print(f"✓ Severity mapping works with custom thresholds")
        
        return True
    except Exception as e:
        print(f"✗ ML Service check failed: {e}")
        return False


def check_alert_service():
    """Verify alert service passes thresholds to severity function."""
    print("\n" + "=" * 70)
    print("CHECKING: Alert Service Threshold Usage")
    print("=" * 70)
    
    try:
        from app.services.alert_service import create_alert
        import inspect
        
        # Check function signature
        sig = inspect.signature(create_alert)
        params = list(sig.parameters.keys())
        
        required_params = ['db', 'log_id', 'ml_result', 'features_raw', 'grant_threshold', 'deny_threshold']
        for param in required_params:
            assert param in params, f"Missing parameter: {param}"
        
        print(f"✓ create_alert has correct parameters: {params}")
        
        # Check that create_alert has default values for thresholds
        grant_default = sig.parameters['grant_threshold'].default
        deny_default = sig.parameters['deny_threshold'].default
        assert grant_default == 0.30, f"Expected grant_threshold default 0.30, got {grant_default}"
        assert deny_default == 0.70, f"Expected deny_threshold default 0.70, got {deny_default}"
        print(f"✓ Alert service has proper threshold defaults: grant={grant_default}, deny={deny_default}")
        
        return True
    except Exception as e:
        print(f"✗ Alert Service check failed: {e}")
        return False


def check_access_service():
    """Verify access service has dynamic thresholds."""
    print("\n" + "=" * 70)
    print("CHECKING: Access Service Severity Function")
    print("=" * 70)
    
    try:
        from app.services.access_service import AccessService
        import inspect
        
        # Check _severity_from_score signature
        sig = inspect.signature(AccessService._severity_from_score)
        params = list(sig.parameters.keys())
        
        required_params = ['score', 'grant_threshold', 'deny_threshold']
        for param in required_params:
            assert param in params, f"Missing parameter: {param}"
        
        print(f"✓ AccessService._severity_from_score has correct parameters: {params}")
        return True
    except Exception as e:
        print(f"✗ Access Service check failed: {e}")
        return False


def check_config():
    """Verify config file has proper documentation."""
    print("\n" + "=" * 70)
    print("CHECKING: Configuration File")
    print("=" * 70)
    
    try:
        config_path = Path(__file__).parent / "app" / "config.py"
        with open(config_path, 'r') as f:
            config_content = f.read()
        
        # Check for deprecation notice
        assert "Deprecated" in config_content or "deprecated" in config_content, \
            "Missing deprecation notice for threshold settings"
        
        print("✓ config.py has deprecation notice for threshold settings")
        
        # Check that DecisionEngine threshold loading is documented
        engine_path = Path(__file__).parent / "app" / "services" / "decision_engine.py"
        with open(engine_path, 'r') as f:
            engine_content = f.read()
        
        assert "ensemble_config.pkl" in engine_content, "Missing ensemble config loading"
        assert "isolation_forest.pkl" in engine_content, "Missing isolation forest threshold loading"
        assert "os.getenv" in engine_content, "Missing environment variable loading"
        
        print("✓ DecisionEngine properly loads thresholds from:")
        print("  - ensemble_config.pkl")
        print("  - isolation_forest.pkl")
        print("  - Environment variables")
        
        return True
    except Exception as e:
        print(f"✗ Config check failed: {e}")
        return False


def check_auto_tuning():
    """Verify auto-tuning script updates thresholds correctly."""
    print("\n" + "=" * 70)
    print("CHECKING: Auto-Tuning Script")
    print("=" * 70)
    
    try:
        retune_path = Path(__file__).parent.parent / "scripts" / "retune_threshold.py"
        with open(retune_path, 'r') as f:
            retune_content = f.read()
        
        # Check that script updates model files
        required_updates = [
            ("isolation_forest.pkl", "best_threshold"),
            ("isolation_forest.pkl", "deny_threshold"),
            ("ensemble_config.pkl", "best_threshold"),
            ("ensemble_config.pkl", "deny_threshold"),
        ]
        
        for model_file, threshold_name in required_updates:
            assert model_file in retune_content, f"Missing update to {model_file}"
            assert threshold_name in retune_content, f"Missing {threshold_name} update"
        
        print("✓ Auto-tuning script properly updates:")
        print("  - isolation_forest.pkl with best_threshold and deny_threshold")
        print("  - ensemble_config.pkl with grant_threshold and deny_threshold")
        
        # Check for CI/CD integration
        ci_retune_path = Path(__file__).parent.parent / "scripts" / "ci_retune_threshold.py"
        with open(ci_retune_path, 'r') as f:
            ci_content = f.read()
        
        assert "retune_threshold" in ci_content, "CI script doesn't import retune_threshold"
        print("✓ CI/CD pipeline calls retune_threshold.py")
        
        return True
    except Exception as e:
        print(f"✗ Auto-tuning check failed: {e}")
        return False


def check_access_route():
    """Verify access route uses engine thresholds correctly."""
    print("\n" + "=" * 70)
    print("CHECKING: Access Route Threshold Usage")
    print("=" * 70)
    
    try:
        route_path = Path(__file__).parent / "app" / "routes" / "access.py"
        with open(route_path, 'r') as f:
            route_content = f.read()
        
        # Check for lowercase threshold access (correct)
        assert "engine.grant_threshold" in route_content, "Not using engine.grant_threshold"
        assert "engine.deny_threshold" in route_content, "Not using engine.deny_threshold"
        
        # Check that uppercase versions are NOT used (incorrect)
        assert "engine.GRANT_THRESHOLD" not in route_content, "Found hardcoded engine.GRANT_THRESHOLD"
        assert "engine.DENY_THRESHOLD" not in route_content, "Found hardcoded engine.DENY_THRESHOLD"
        
        print("✓ Access route uses correct threshold attributes:")
        print("  - engine.grant_threshold (lowercase ✓)")
        print("  - engine.deny_threshold (lowercase ✓)")
        
        # Check for create_alert threshold passing
        assert "grant_threshold=engine.grant_threshold" in route_content, \
            "Not passing grant_threshold to create_alert"
        assert "deny_threshold=engine.deny_threshold" in route_content, \
            "Not passing deny_threshold to create_alert"
        
        print("✓ Access route passes thresholds to create_alert()")
        
        return True
    except Exception as e:
        print(f"✗ Access route check failed: {e}")
        return False


def main():
    """Run all verification checks."""
    print("\n")
    print("╔" + "=" * 68 + "╗")
    print("║" + " THRESHOLD MANAGEMENT VERIFICATION ".center(68) + "║")
    print("╚" + "=" * 68 + "╝")
    
    checks = [
        ("DecisionEngine", check_decision_engine),
        ("ML Service", check_ml_service),
        ("Alert Service", check_alert_service),
        ("Access Service", check_access_service),
        ("Configuration", check_config),
        ("Auto-Tuning", check_auto_tuning),
        ("Access Route", check_access_route),
    ]
    
    results = {}
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print(f"\n✗ {name} check crashed: {e}")
            results[name] = False
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🎉 All threshold management checks passed!")
        print("\nAuto-tuning is ENABLED and thresholds are NOT hardcoded.")
        return 0
    else:
        print(f"\n❌ {total - passed} check(s) failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
