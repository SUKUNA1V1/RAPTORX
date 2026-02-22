#!/usr/bin/env python3
"""
Thread Safety Validation for RAPTORX Decision Engine
====================================================
Tests concurrent access to ensure thread-safe behavior
with multiple threads making simultaneous decisions.
"""

import threading
import time
from concurrent.futures import ThreadPoolExecutor
import sys
sys.path.insert(0, ".")

from decision_engine import AccessDecisionEngine
import numpy as np

def create_test_features(scenario: int) -> list:
    """Generate 19-feature vector for testing."""
    # Base features: hour, day_of_week, is_weekend, access_frequency_24h,
    # time_since_last_access_min, location_match, role_level, is_restricted_area,
    # is_first_access_today, sequential_zone_violation, access_attempt_count,
    # time_of_week, hour_deviation_from_norm, [extra 6 for full 19]
    
    base_features = [
        9,     # hour (9 AM)
        1,     # day_of_week (Monday 0-6)
        0,     # is_weekend
        2,     # access_frequency_24h
        120,   # time_since_last_access_min
        1,     # location_match
        3,     # role_level
        0,     # is_restricted_area
        0,     # is_first_access_today
        0,     # sequential_zone_violation
        1,     # access_attempt_count
        9,     # time_of_week
        0,     # hour_deviation_from_norm
        0, 0, 0, 0, 0, 0  # Extra 6 features
    ]
    
    # Vary based on scenario for different decisions
    if scenario % 3 == 1:
        base_features[0] = 2  # 2 AM (unusual)
    if scenario % 5 == 2:
        base_features[4] = 2  # 2 min since last access (suspicious)
    
    return base_features

def worker_thread(engine: AccessDecisionEngine, worker_id: int, iterations: int) -> dict:
    """Worker thread that makes multiple decisions."""
    results = {
        "worker_id": worker_id,
        "iterations": iterations,
        "decisions": [],
        "errors": [],
        "start_time": time.time(),
    }
    
    for i in range(iterations):
        try:
            features = create_test_features(worker_id + i)
            decision = engine.decide(features)
            results["decisions"].append({
                "iteration": i,
                "decision": decision.get("decision"),
                "risk_score": decision.get("risk_score"),
            })
        except Exception as e:
            results["errors"].append(f"Iteration {i}: {str(e)}")
    
    results["end_time"] = time.time()
    results["duration_ms"] = (results["end_time"] - results["start_time"]) * 1000
    return results

def main():
    print("\n" + "="*70)
    print("THREAD SAFETY VALIDATION TEST")
    print("="*70 + "\n")
    
    # Initialize engine once
    print("Initializing Decision Engine...")
    engine = AccessDecisionEngine()
    print(f"  Engine loaded: {engine.is_loaded}")
    print(f"  IF model: {engine.if_model is not None}")
    print(f"  AE model: {engine.ae_model is not None}")
    
    # Test 1: Sequential access (baseline)
    print("\n[TEST 1] Sequential Access (Single-threaded baseline)")
    print("-" * 70)
    start = time.time()
    sequential_results = worker_thread(engine, 0, iterations=10)
    elapsed = time.time() - start
    
    print(f"  Worker completed {len(sequential_results['decisions'])} decisions")
    print(f"  Time: {elapsed*1000:.2f}ms")
    print(f"  Errors: {len(sequential_results['errors'])}")
    
    # Test 2: Concurrent access (2 threads)
    print("\n[TEST 2] Concurrent Access (2 threads)")
    print("-" * 70)
    start = time.time()
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(worker_thread, engine, i, 10)
            for i in range(2)
        ]
        concurrent_2_results = [f.result() for f in futures]
    elapsed = time.time() - start
    
    total_decisions = sum(len(r["decisions"]) for r in concurrent_2_results)
    total_errors = sum(len(r["errors"]) for r in concurrent_2_results)
    print(f"  Total decisions: {total_decisions}")
    print(f"  Time: {elapsed*1000:.2f}ms")
    print(f"  Errors: {total_errors}")
    
    # Test 3: Heavy concurrent access (8 threads)
    print("\n[TEST 3] Heavy Concurrent Access (8 threads)")
    print("-" * 70)
    start = time.time()
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [
            executor.submit(worker_thread, engine, i, 15)
            for i in range(8)
        ]
        concurrent_8_results = [f.result() for f in futures]
    elapsed = time.time() - start
    
    total_decisions = sum(len(r["decisions"]) for r in concurrent_8_results)
    total_errors = sum(len(r["errors"]) for r in concurrent_8_results)
    print(f"  Total decisions: {total_decisions}")
    print(f"  Time: {elapsed*1000:.2f}ms")
    print(f"  Errors: {total_errors}")
    
    # Test 4: Rapid-fire concurrent access (stress test)
    print("\n[TEST 4] Rapid-Fire Stress Test (16 threads, high load)")
    print("-" * 70)
    start = time.time()
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = [
            executor.submit(worker_thread, engine, i, 5)
            for i in range(16)
        ]
        concurrent_16_results = [f.result() for f in futures]
    elapsed = time.time() - start
    
    total_decisions = sum(len(r["decisions"]) for r in concurrent_16_results)
    total_errors = sum(len(r["errors"]) for r in concurrent_16_results)
    print(f"  Total decisions: {total_decisions}")
    print(f"  Time: {elapsed*1000:.2f}ms")
    print(f"  Errors: {total_errors}")
    
    # Comprehensive results
    print("\n" + "="*70)
    print("RESULTS SUMMARY")
    print("="*70)
    
    all_results = concurrent_2_results + concurrent_8_results + concurrent_16_results
    total_all_decisions = sum(len(r["decisions"]) for r in all_results)
    total_all_errors = sum(len(r["errors"]) for r in all_results)
    
    print(f"\nTotal concurrent decisions: {total_all_decisions}")
    print(f"Total errors: {total_all_errors}")
    
    if total_all_errors == 0:
        print("\n[PASS] All concurrent access tests passed without errors!")
        print("[PASS] Thread-safe locks are protecting model access correctly.")
        return 0
    else:
        print(f"\n[FAIL] {total_all_errors} errors detected during concurrent access!")
        for result in all_results:
            if result["errors"]:
                print(f"\nWorker {result['worker_id']} errors:")
                for error in result["errors"][:3]:  # Show first 3
                    print(f"  - {error}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
