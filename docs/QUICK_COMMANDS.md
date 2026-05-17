# Quick Copy-Paste Commands

Just copy and run these in order on your other PC.

---

## SETUP (Run Once)
```powershell
cd c:\Users\SUKUNA\RAPTORX
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt --upgrade
```

---

## TEST 1 - VERIFY ALL FIXES (Most Important)
```powershell
python test_ml_fixes.py
```
👉 **Check for: All 6 tests show [PASS]**

---

## TEST 2 - AUTO-RETUNING (Optimize Thresholds)
```powershell
python scripts/ci_retune_threshold.py
```
👉 **Check for: "status": "success" in retune_results.json**

---

## TEST 3 - START BACKEND (Keep Running)
```powershell
cd backend
python startup_backend.py
```
👉 **Check for: "Uvicorn running on http://127.0.0.1:8000"**
👉 **Leave this terminal open**

---

## TEST 4 - TEST API (New Terminal Window)
```powershell
cd c:\Users\SUKUNA\RAPTORX
python test_api.py
```
👉 **Check for: Normal access = "granted", Anomalies = "denied"**

---

## OPTIONAL - CHECK DECISION QUALITY
```powershell
type backend/logs/access_decisions.log | Select-Object -Last 50
```
👉 **Check for: Correct decisions for normal and anomalous access**

---

## What Each Test Checks

| Test | Command | Expected Result |
|------|---------|-----------------|
| Test 1 | `test_ml_fixes.py` | All 6 [PASS] |
| Test 2 | `ci_retune_threshold.py` | status: success |
| Test 3 | `startup_backend.py` | Server runs clean |
| Test 4 | `test_api.py` | Correct decisions |

---

## Done When

All tests pass with [PASS] marks ✓

---

## Issues?

Check EXACT_COMMANDS_TO_RUN.md for detailed help troubleshooting section.
