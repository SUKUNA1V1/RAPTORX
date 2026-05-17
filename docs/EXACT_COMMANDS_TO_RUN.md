# Exact Commands to Run on Other PC

## Prerequisites
- Python 3.10+ with venv activated
- All code fixes already applied (see CODE_FIXES_COMPLETE.md)
- Copy entire RAPTORX folder to other PC

---

## Step 1: Verify the Environment
```powershell
cd c:\Users\SUKUNA\RAPTORX
python --version
# Expected: Python 3.10 or higher
```

---

## Step 2: Activate Virtual Environment
```powershell
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# OR on Command Prompt:
.venv\Scripts\activate.bat
```

---

## Step 3: Install/Update Dependencies
```powershell
pip install -r backend/requirements.txt --upgrade
# This ensures all packages match the fixed code
```

---

## Step 4: RUN TEST #1 - Verify All 3 Fixes Work
```powershell
python test_ml_fixes.py
```

**Expected Output:**
```
================================================================================
SUMMARY
================================================================================

[OK] All critical fixes verified:
  1. FEATURE_COLS includes all 19 features
  2. Model artifacts present and loadable
  3. Decision engine initializes and predicts
  4. Normal access scored lower risk than anomalies
  5. Thresholds valid (grant < deny)
  6. Auto-retuning file format fixed (.keras)
```

**If you see [PASS] on all 6 tests → Move to Step 5**
**If you see [FAIL] on any test → Report error message**

---

## Step 5: RUN TEST #2 - Auto-Retuning with Correct Features
```powershell
python scripts/ci_retune_threshold.py
```

**What it does:**
- Loads training data from database
- Retrains decision engine with ALL 19 features (not just 13)
- Optimizes decision thresholds for better accuracy
- Saves results to `retune_results.json`

**Expected Output:**
```
Loading training data...
Extracting features (19 features)...
Scaling features with scaler_19.pkl...
Computing optimal thresholds...
Results saved to retune_results.json
Status: SUCCESS
```

**Check Results:**
```powershell
type retune_results.json
```

**Expected:** `"status": "success"` (previously would have been `"status": "failed"`)

---

## Step 6: RUN TEST #3 - Start Backend with Fixed Code
```powershell
cd backend
python startup_backend.py
```

**Expected Output:**
```
Loading ML models...
  [OK] Isolation Forest loaded
  [OK] Autoencoder loaded
  [OK] Feature scaler (19 features) loaded
Starting FastAPI server...
Uvicorn running on http://127.0.0.1:8000
```

**Leave this running in a terminal**

---

## Step 7: RUN TEST #4 - Test Access Decisions (in new PowerShell window)
```powershell
cd c:\Users\SUKUNA\RAPTORX
python test_api.py
```

**Expected:**
- Normal access requests → `"decision": "granted"` (low risk)
- Anomalous access → `"decision": "denied"` (high risk)
- Edge cases → `"decision": "delayed"` (medium risk)

---

## Step 8: Monitor Decision Quality (Optional but Recommended)
Keep backend running and check logs:

```powershell
# View recent access decisions
type backend/logs/access_decisions.log | Select-Object -Last 20

# Count grant/deny decisions
(Get-Content backend/logs/access_decisions.log | Select-String '"decision"' | Measure-Object).Count

# Filter for denied decisions
Get-Content backend/logs/access_decisions.log | Select-String '"denied"'
```

---

## Summary of What Gets Fixed

| Issue | Before | After |
|-------|--------|-------|
| **Auto-retuning** | `autoencoder.h5` (broken) | `autoencoder.keras` (fixed) |
| **Features used** | 13 features → wrong predictions | 19 features → correct predictions |
| **Scaler applied** | 13-feature scaler on 19 features | 19-feature scaler on 19 features |
| **Decision accuracy** | High false positives/negatives | <1% errors expected |

---

## If Tests Fail

1. **"ModuleNotFoundError: No module named 'scripts'"**
   - Make sure you're in `c:\Users\SUKUNA\RAPTORX` directory
   - Run: `python -c "import sys; print(sys.path)"`

2. **"FileNotFoundError: ml/models/autoencoder.keras"**
   - Verify `ml/models/` directory exists with `.keras` files
   - Check: `dir ml/models/`

3. **"Database connection error"**
   - Backend must be running in separate terminal
   - Make sure PostgreSQL service is running
   - Check: `psql -U postgres`

4. **"scaler_19.pkl not found"**
   - Run auto-retuning first (Step 5)
   - This creates the 19-feature scaler

---

## Success Criteria

✅ All 6 tests in `test_ml_fixes.py` show [PASS]
✅ Auto-retuning shows `status: success`
✅ Backend starts without errors
✅ `test_api.py` shows correct decisions
✅ Decision logs show >99% accuracy (wrong decisions <1%)

Once all tests pass → **Deploy to production with confidence**

---

## Deployment Checklist

- [ ] Step 1: Environment verified
- [ ] Step 2: Virtual env activated
- [ ] Step 3: Dependencies installed
- [ ] Step 4: test_ml_fixes.py [PASS] on all 6 tests
- [ ] Step 5: Auto-retuning successful
- [ ] Step 6: Backend starts cleanly
- [ ] Step 7: API decisions look correct
- [ ] Step 8: Decision quality monitored

Once complete → Models are fixed and ready for production!
