"""Quick test to verify ensemble weights without full model loading"""

import sys
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.decision_engine import AccessDecisionEngine

print("=" * 70)
print("ENSEMBLE WEIGHTS TEST")
print("=" * 70)
print()

engine = AccessDecisionEngine()

print(f"✓ Models loaded")
print(f"  IF_WEIGHT: {engine.IF_WEIGHT}")
print(f"  AE_WEIGHT: {engine.AE_WEIGHT}")
print(f"  Grant threshold: {engine.GRANT_THRESHOLD}")
print(f"  Deny threshold: {engine.DENY_THRESHOLD}")
print()

# Quick calculation demo
print("Example ensemble calculation:")
print(f"  IF Score: 0.69, AE Score: 0.07")
print(f"  Combined: 0.3*0.69 + 0.7*0.07 = {0.3*0.69 + 0.7*0.07:.4f}")
print()
print("  With IF=0.45, AE=0.55:")
print(f"  Combined: 0.45*0.69 + 0.55*0.07 = {0.45*0.69 + 0.55*0.07:.4f}")
print()
print("=" * 70)
