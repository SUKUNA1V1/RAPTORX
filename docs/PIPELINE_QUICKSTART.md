# RaptorX ML Pipeline - Quick Start Guide

## Overview

Pipeline entry points for the complete ML pipeline:

1. **`run_pipeline.py`** - Root wrapper for automated end-to-end execution (recommended)
2. **`scripts/run_pipeline_interactive.py`** - Interactive step-by-step runner
3. **`scripts/startup.py`** - Menu-driven launcher

## Quick Start (Recommended)

### Option A: Run Everything Automatically

```bash
# From workspace root
python run_pipeline.py
```

This will:
1. ✓ Generate 500k synthetic access records
2. ✓ Explore and scale the data
3. ✓ Train Isolation Forest model
4. ✓ Train Autoencoder model  
5. ✓ Compare and build ensemble
6. ✓ Tune decision thresholds
7. ✓ Run validation tests
8. ✓ Verify thread safety
9. ✓ Final system validation

**Estimated time:** 45-90 minutes (depends on hardware)

## Pipeline Steps Explained

### Step 1: Generate Synthetic Data
- **Script**: `generate_data_fixed.py`
- **Input**: None (generates 500k synthetic records)
- **Output**: `data/raw/train.csv`, `data/raw/test.csv`
- **Purpose**: Create realistic access patterns with 7% anomalies
- **Time**: 10-20 minutes

### Step 2: Explore & Prepare Data
- **Script**: `scripts/explore_and_prepare.py`
- **Input**: Generated raw data
- **Output**: 
  - `data/processed/train_scaled.csv` (scaled features)
  - `data/processed/test_scaled.csv`
  - `ml/models/scaler_13.pkl` (MinMax scaler)
- **Purpose**: Scale features to [0,1] range for models
- **Time**: 5-10 minutes

### Step 3: Train Isolation Forest
- **Script**: `scripts/train_isolation_forest.py`
- **Input**: Training data (normal samples only)
- **Output**: `ml/models/isolation_forest.pkl`
- **Purpose**: Tree-based anomaly detection
- **Time**: 10-20 minutes

### Step 4: Train Autoencoder
- **Script**: `scripts/train_autoencoder.py`
- **Input**: Training data
- **Output**: `ml/models/autoencoder.keras`
- **Purpose**: Reconstruction-based anomaly detection
- **Time**: 20-40 minutes (depends on GPU)

### Step 5: Compare & Ensemble
- **Script**: `scripts/compare_and_ensemble.py`
- **Input**: Both trained models + test data
- **Output**: 
  - `ml/models/ensemble_config.pkl`
  - `ml/models/current.json` (registry)
- **Purpose**: Weighted ensemble with IF=0.3, AE=0.7
- **Time**: 5-10 minutes

### Step 6: Retune Thresholds
- **Script**: `scripts/retune_threshold.py`
- **Input**: Validation data + ensemble
- **Output**: Updated threshold in model registry
- **Purpose**: Optimize grant/deny thresholds for F1 score
- **Time**: 2-5 minutes

### Step 7: Quick Validation
- **Script**: `scripts/quick_test.py`
- **Input**: Test data + final models
- **Output**: Precision, Recall, F1 metrics
- **Purpose**: Sanity check on model performance
- **Time**: 1-2 minutes

### Step 8: Thread Safety Test
- **Script**: `scripts/test_thread_safety.py`
- **Input**: None (generates test data)
- **Output**: Concurrent inference test results
- **Purpose**: Verify backend can handle parallel requests
- **Time**: 2-5 minutes

### Step 9: System Validation
- **Script**: `scripts/validate_system.py`
- **Input**: All artifacts
- **Output**: Comprehensive system health report
- **Purpose**: Final verification before running backend
- **Time**: 2-5 minutes

## After Pipeline Completes

### Start the Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Start the Frontend (new terminal)

```bash
cd frontend
npm run dev
```

Expected output:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Open Dashboard

Visit: **http://localhost:3000**

## Testing the System

### 1. Dashboard
- View system metrics
- See access decision distribution
- Monitor alert trends

### 2. Simulator (Recommended First Test)
- Click "Simulator" in sidebar
- Submit test access requests
- Observe decisions and risk scores
- Try different user/access-point combinations

### 3. Logs
- View all access decisions with risk scores
- See raw/scaled feature values
- Check decision explanations

### 4. Alerts
- View detected anomalies
- Resolve or mark as false positive
- See alert severity and confidence

### 5. ML Status
- View model configuration
- Check IF and AE weights (0.3 / 0.7)
- See grant/deny thresholds
- Verify ensemble mode is active

## Interactive Mode (Alternative)

If you prefer step-by-step control:

```bash
python scripts/run_pipeline_interactive.py
```

This opens a menu where you can:
1. Run all steps automatically
2. Run with pauses between steps
3. Run a single step
4. Verify existing models only
5. See pipeline details

## Troubleshooting

### "Script not found" errors
- Ensure you're in the workspace root directory
- Check that pipeline scripts exist under `scripts/`

### Out of memory during training
- Autoencoder is memory-intensive
- Try closing other applications
- If still failing, you can run steps individually and skip problematic steps

### Models not found after pipeline
- Check that directories exist: `data/processed/`, `ml/models/`
- Verify the pipeline completed without errors
- Run `python scripts/run_pipeline_interactive.py` and choose option 4 to verify artifacts

### Backend won't start
- Ensure Postgres database is running
- Check `backend/.env` has correct DATABASE_URL
- Verify port 8000 is not in use: `netstat -ano | findstr :8000`

### Frontend shows "Cannot reach backend"
- Ensure backend is running on port 8000
- Check `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Try in browser: http://localhost:8000/health

## Environment Requirements

**Python**: 3.11+ (3.13 tested)

**Key Dependencies**:
- scikit-learn (Isolation Forest)
- tensorflow/keras (Autoencoder)
- pandas (data processing)
- numpy (numerical ops)
- sqlalchemy (database ORM)

All are already in `backend/requirements.txt` and configured.

## File Outputs Summary

After successful pipeline run, you'll have:

```
data/
  processed/
    train_scaled.csv          # 13 feature columns + label
    test_scaled.csv
    val_scaled.csv (created if missing)

ml/
  models/
    isolation_forest.pkl      # IF model + metadata
    autoencoder.keras         # AE weights
    autoencoder_config.pkl    # AE normalization params
    scaler_13.pkl             # MinMax scaler
    ensemble_config.pkl       # Weighted ensemble config
    current.json              # Model registry pointer
    
  results/
    isolation_forest/         # IF training results
    autoencoder/              # AE training results
    ensemble/                 # Ensemble comparison results

logs/
  access_decisions_audit.log  # Decision audit trail
```

## Next Steps After Testing

1. **Explore decision explanations** at `/explainability` page
2. **Run simulator** with various user profiles to understand model behavior
3. **Check access logs** to see feature values and decision reasoning
4. **Review ML status** to understand ensemble weights and thresholds
5. **Experiment with threshold tuning** via `scripts/retune_threshold.py` for production

## Questions?

Refer to:
- `README.md` - Full system documentation
- `CI_CD_GUIDE.md` - Automated deployment pipelines
- `EXPLAINABILITY_INTEGRATION.md` - Decision explanations
- `THREAD_SAFETY.md` - Concurrent access details

---

**Happy testing! 🚀**
