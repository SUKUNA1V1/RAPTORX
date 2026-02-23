# RaptorX ML Pipeline Scripts - Complete Documentation

## Overview

Three comprehensive Python scripts have been created to automate the entire ML pipeline from data generation through model training and validation. These scripts replace the manual step-by-step process and provide an automated, monitored workflow that culminates with models ready for backend testing.

---

## Scripts Created

### 1. **run_full_pipeline.py** ⭐ (RECOMMENDED)
**Purpose**: Complete automated pipeline execution

**When to Use**: 
- First-time setup
- You want everything to run from start to finish
- You prefer automatic progress reporting and error handling

**How to Run**:
```bash
python run_full_pipeline.py
```

**Features**:
- ✓ Automatic execution of all 9 pipeline steps
- ✓ Real-time progress reporting with colored output
- ✓ Detailed timing for each step
- ✓ Error handling and recovery
- ✓ Comprehensive execution summary
- ✓ Clear next steps instructions

**Output Example**:
```
================================================================================
  RAPTORX FULL ML PIPELINE
================================================================================

Start time: 2026-02-23 14:32:15
Working directory: e:\RAPTORX

[STEP 1/9] Generate Synthetic Data
-----------...
  → Running: generate_data_fixed.py
  ✓ Generate Synthetic Data completed in 847.3s

[STEP 2/9] Explore & Prepare Data
...
  ✓ All critical artifacts are ready for backend

================================================================================
  NEXT STEPS
================================================================================

✓ Pipeline completed successfully!

ML Models are now ready. To test the complete system:

1. START BACKEND:
   cd backend
   uvicorn app.main:app --reload --port 8000

2. START FRONTEND (in new terminal):
   cd frontend
   npm run dev

3. OPEN DASHBOARD:
   http://localhost:3000
```

**Estimated Runtime**: 45-90 minutes (depends on hardware)

---

### 2. **run_pipeline_interactive.py**
**Purpose**: Step-by-step interactive pipeline execution

**When to Use**:
- You want to inspect results between steps
- You want to pause and examine intermediate artifacts
- You prefer manual control over the pipeline flow
- You want to run individual steps only

**How to Run**:
```bash
python run_pipeline_interactive.py
```

**Features**:
- ✓ Interactive menu system
- ✓ Run all steps, or pause between each step
- ✓ Select individual steps to run
- ✓ Verify existing models without retraining
- ✓ Step descriptions and details

**Menu Options**:
```
PIPELINE OPTIONS:
  1) Run ALL steps automatically (recommended for first run)
  2) Run steps interactively (pause after each step)
  3) Run a single step (choose specific step)
  4) Verify existing models only (skip training)
  5) Show pipeline details
  6) Exit
```

**Use Case Example**:
```
# Run full pipeline with pauses
python run_pipeline_interactive.py
→ Choose option 2
→ Run step 1 (generate data)
→ Inspect data/raw/ directory
→ Press ENTER to run step 2
→ Continue as needed
```

---

### 3. **startup.py**
**Purpose**: Unified control center for pipeline and backend/frontend startup

**When to Use**:
- Single entry point for all RaptorX operations
- You want a menu-driven interface
- You prefer not to remember multiple commands

**How to Run**:
```bash
python startup.py
```

**Menu Options**:
```
[1] RUN FULL ML PIPELINE (Recommended)
[2] RUN PIPELINE INTERACTIVELY
[3] VERIFY EXISTING MODELS
[4] START BACKEND ONLY
[5] START FULL STACK (BACKEND + FRONTEND)
[6] VIEW QUICK START GUIDE
[7] EXIT
```

**Example Workflow**:
```
python startup.py
→ Choose 1 (full pipeline)
→ Wait for completion
→ Choose 4 (start backend)
→ In another terminal: cd frontend && npm run dev
→ Open http://localhost:3000
```

---

## Pipeline Stages Explained

The pipeline executes these stages sequentially:

| Step | Name | Script | Input | Output | Time |
|------|------|--------|-------|--------|------|
| 1 | Generate Data | generate_data_fixed.py | - | train.csv, test.csv | 10-20m |
| 2 | Prepare Data | explore_and_prepare.py | raw CSV | train_scaled.csv | 5-10m |
| 3 | Train IF | train_isolation_forest.py | scaled data | isolation_forest.pkl | 10-20m |
| 4 | Train AE | train_autoencoder.py | scaled data | autoencoder.keras | 20-40m |
| 5 | Ensemble | compare_and_ensemble.py | both models | ensemble_config.pkl | 5-10m |
| 6 | Tune Thresholds | retune_threshold.py | ensemble | current.json | 2-5m |
| 7 | Quick Test | quick_test.py | all artifacts | metrics report | 1-2m |
| 8 | Thread Safety | test_thread_safety.py | models | concurrency report | 2-5m |
| 9 | Validate | validate_system.py | all | validation report | 2-5m |

---

## Common Workflows

### Workflow A: Fresh Installation (First Time)
```bash
# In workspace root
python run_full_pipeline.py

# After completion (in new terminals):
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2:
cd frontend
npm run dev

# Terminal 3:
# Open http://localhost:3000
```

### Workflow B: Using the Startup Menu
```bash
python startup.py
→ Choose [1] (full pipeline)
→ Wait for completion
→ Choose [4] (start backend)
→ Follow instructions for frontend
```

### Workflow C: Interactive with Inspection
```bash
python run_pipeline_interactive.py
→ Choose [2] (interactive mode)
→ Run step 1, inspect data/raw/
→ Run step 2, inspect data/processed/
→ Continue through training steps
→ Use [4] option to verify final artifacts
```

### Workflow D: Re-run Only Validation (Models Already Trained)
```bash
python run_pipeline_interactive.py
→ Choose [4] (verify models)
→ Confirm artifacts exist
→ Use [3] to run step 7 (quick test)
```

### Workflow E: Rebuild Only Ensemble (Keep Training Data)
```bash
python run_pipeline_interactive.py
→ Choose [3]
→ Type 5 (run compare_and_ensemble.py)
→ Models are rebuild
```

---

## File Structure After Successful Pipeline

```
e:\RAPTORX\
├── run_full_pipeline.py          ← New: Full automation
├── run_pipeline_interactive.py    ← New: Interactive runner
├── startup.py                     ← New: Unified menu
├── PIPELINE_QUICKSTART.md         ← New: Quick reference
│
├── data/
│   └── processed/
│       ├── train_scaled.csv       ← 13 features
│       ├── test_scaled.csv
│       └── val_scaled.csv
│
├── ml/
│   └── models/
│       ├── isolation_forest.pkl   ← Trained IF
│       ├── autoencoder.keras      ← Trained AE
│       ├── scaler_13.pkl          ← Feature scaling
│       ├── ensemble_config.pkl    ← Weights: IF=0.3, AE=0.7
│       └── current.json           ← Model registry
│
├── logs/
│   └── access_decisions_audit.log ← Decision audit trail
│
└── backend/ + frontend/           ← Ready for testing
```

---

## Monitoring Progress

### During Execution

**Full Pipeline Script Output**:
```
[STEP 1/9] Generate Synthetic Data
  → Running: generate_data_fixed.py
  → Timeout: 600 seconds
  [Progress shown in real-time]
  ✓ Generate Synthetic Data completed in 847.3s
```

### After Completion

Both scripts provide:
- ✓ Summary of passed/failed steps
- ✓ Total execution time
- ✓ Next steps instructions
- ✓ Troubleshooting resources

---

## Troubleshooting

### "Script not found" Error
**Solution**: Ensure all `.py` files exist in the workspace root directory
```bash
dir *.py | findstr "generate\|explore\|train\|compare\|retune\|quick\|thread\|validate"
```

### Pipeline Stops at Step N
**Solution**: Check the error output above for the specific failure. Common causes:
- Insufficient disk space (check `data/` folder size)
- Out of memory (close other applications)
- Missing dependencies (reinstall from requirements.txt)

### Models Missing After Pipeline
**Solution**: Verify in interactive mode:
```bash
python run_pipeline_interactive.py
→ Choose [4] (verify models)
```

### Backend Won't Connect
**Solution**: 
```bash
# Verify backend running
curl http://localhost:8000/health

# Check Postgres connection
# Edit backend/.env and verify DATABASE_URL
```

### Frontend Shows "Cannot reach backend"
**Solution**:
```bash
# Check frontend/.env.local
cat frontend/.env.local

# Should show:
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Performance Optimization

### Speed Up Training
- **GPU Support**: Models automatically use GPU if CUDA-compatible GPU is available
- **Skip Data Generation**: If data already exists, comment out step 1
- **Reduce Dataset Size**: Edit `generate_data_fixed.py`, change `TOTAL_RECORDS = 500000`

### Memory Management
- **Autoencoder Training**: Most memory-intensive (steps 4)
- **If OOM occurs**: Reduce batch size in `train_autoencoder.py`
- **Sequential vs Parallel**: Current pipeline runs sequentially (safe, no resource conflicts)

---

## What Happens After Pipeline Completes

### Models Are Ready For:
✓ Inference in FastAPI backend
✓ Real-time access decisions
✓ Anomaly detection with explainability
✓ Dashboard visualization and alert generation

### Backend Will:
- Load models from `ml/models/current.json`
- Use ensemble configuration (IF weight 0.3, AE weight 0.7)
- Apply learned thresholds for grant/deny/delayed decisions
- Generate audit logs for all decisions
- Create anomaly alerts for high-risk access attempts

### Testing Can Include:
- Manual simulator requests
- Batch API calls to `/api/access/request`
- Checking alert generation at `/api/alerts`
- Reviewing decision explainability at `/api/explainations/decision/{log_id}`
- Monitoring performance at `/api/stats/*`

---

## Next Steps

1. **Choose Your Runner**:
   - First time? Use `python run_full_pipeline.py`
   - Want control? Use `python run_pipeline_interactive.py`
   - Prefer menus? Use `python startup.py`

2. **Wait for Completion** (45-90 minutes)

3. **Start Backend**:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

4. **Start Frontend** (new terminal):
   ```bash
   cd frontend
   npm run dev
   ```

5. **Open Dashboard**: http://localhost:3000

6. **Test System**:
   - Go to Simulator
   - Make access requests
   - Review logs, alerts, and ML status
   - Check explainability for decisions

---

## Reference Files

- `PIPELINE_QUICKSTART.md` - Quick reference guide
- `README.md` - Full system documentation
- `CI_CD_GUIDE.md` - Automated deployment pipelines

---

**Created**: February 23, 2026
**Status**: Ready for production use ✓
