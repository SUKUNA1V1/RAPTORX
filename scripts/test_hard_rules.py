"""
Quick test to verify hard rules work correctly without loading models.
"""

import sys
import os

# Use the decision engine directly from scripts
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=" * 70)
print("HARD RULES TEST")
print("=" * 70)
print()

# Test 1: Concurrent session should trigger hard rule
print("Test 1: Concurrent session detection")
print("-" * 70)

features_scaled = [0.5] * 13 + [0] * 6  # Dummy scaled features
features_unscaled = [10, 2, 0, 5, 60, 1, 2, 0, 0, 0, 1, 51, 1.8] + [0]*3 + [0, 0, 1]  # Position 18 = concurrent_session

print(f"  Scaled features length: {len(features_scaled)}")
print(f"  Unscaled features length: {len(features_unscaled)}")
print(f"  Concurrent session flag (position 18): {features_unscaled[18]}")
print()

# Import after changing directory
from decision_engine import AccessDecisionEngine

engine = AccessDecisionEngine()
result = engine.decide(features_scaled, features_unscaled=features_unscaled)

print(f"  Decision: {result['decision'].upper()}")
print(f"  Risk Score: {result['risk_score']}")
print(f"  Reasoning: {result['reasoning']}")
print(f"  Mode: {result['mode']}")
print()

if result['decision'] == 'denied' and result['mode'] == 'hard_rule':
    print("  ✓ PASS: Hard rule correctly returns DENIED for concurrent session")
else:
    print(f"  ✗ FAIL: Expected DENIED (hard_rule), got {result['decision']} ({result['mode']})")

print()

# Test 2: Normal access should use ML scoring
print("Test 2: Normal access (no hard rule violations)")
print("-" * 70)

features_scaled = [0.5] * 13 + [0] * 6  # Dummy scaled features
features_unscaled = [10, 2, 0, 5, 60, 1, 2, 0, 0, 0, 1, 51, 1.8] + [0]*3 + [0, 0, 0]  # No hard rule flags

print(f"  Concurrent session flag (position 18): {features_unscaled[18]}")
print()

result = engine.decide(features_scaled, features_unscaled=features_unscaled)

print(f"  Decision: {result['decision'].upper()}")
print(f"  Risk Score: {result['risk_score']}")
print(f"  Reasoning: {result['reasoning']}")
print(f"  Mode: {result['mode']}")
print()

if result['mode'] in ['ensemble', 'rule_based']:
    print("  ✓ PASS: Normal access uses ML/rule-based scoring (not hard_rule)")
else:
    print(f"  ✗ FAIL: Expected ensemble/rule_based, got {result['mode']}")

print()
print("=" * 70)
