# ML Pipeline Automation - Summary

## What Was Created

I've created a complete ML pipeline automation system with **3 Python scripts** and **2 comprehensive guides** to help you run the entire RaptorX workflow from data generation through backend testing.

### 📁 New Files Created

1. **`run_full_pipeline.py`** (530 lines)
   - Fully automated end-to-end pipeline execution
   - Runs all 9 steps sequentially with detailed progress tracking
   - Recommended for first-time setup
   - Shows real-time execution, timing, and final summary

2. **`run_pipeline_interactive.py`** (350 lines)
   - Interactive menu-driven pipeline runner
   - Pause between steps, run individual steps, or run all
   - Verify models without retraining
   - Great for inspection and experimentation

3. **`startup.py`** (250 lines)
   - Unified entry point menu
   - Run pipeline, verify models, start backend, view guides
   - Single script for all RaptorX operations
   - Beginner-friendly interface

4. **`PIPELINE_QUICKSTART.md`** (Documentation)
   - Quick reference guide for pipeline usage
   - Step descriptions and expected outputs
   - Troubleshooting tips
   - Testing instructions after pipeline completes

5. **`PIPELINE_SCRIPTS.md`** (Documentation)
   - Complete technical documentation
   - Detailed workflow examples
   - Performance optimization tips
   - Reference for all scripts

---

## Quick Start (3 Commands)

### Option 1: Fully Automated (RECOMMENDED) ⭐

```bash
# Run everything automatically
python run_full_pipeline.py

# Wait for completion (45-90 minutes)

# Start backend (tab 1)
cd backend && uvicorn app.main:app --reload --port 8000

# Start frontend (tab 2)
cd frontend && npm run dev

# Open browser
# http://localhost:3000
```

### Option 2: Interactive Menu

```bash
# Launch interactive menu
python startup.py

# Choose [1] to run full pipeline
# After completion, choose [4] to start backend
```

### Option 3: Step-by-Step with Control

```bash
# Launch interactive pipeline runner
python run_pipeline_interactive.py

# Choose [2] for interactive mode
# Pause and inspect between each step
```

---

## The Pipeline (9 Stages)

When you run the pipeline, it automatically executes these stages:

```
1. Generate Synthetic Data        (10-20 min)
   └─ Creates 500k realistic access records with 7% anomalies

2. Explore & Prepare Data         (5-10 min)
   └─ Scales features, creates train/test/val splits

3. Train Isolation Forest         (10-20 min)
   └─ Tree-based anomaly detection model

4. Train Autoencoder             (20-40 min)
   └─ Deep learning reconstruction model

5. Compare & Ensemble            (5-10 min)
   └─ Weighted ensemble (IF=30%, AE=70%)

6. Retune Thresholds             (2-5 min)
   └─ Optimize grant/deny decision boundaries

7. Quick Validation Test         (1-2 min)
   └─ Precision, recall, F1 metrics

8. Thread Safety Test            (2-5 min)
   └─ Concurrent inference verification

9. Full System Validation        (2-5 min)
   └─ Complete artifact verification
```

**Total estimated time: 45-90 minutes**

---

## After Pipeline Completes

The backend will have models ready to use:

### ✓ Generated Artifacts
```
data/processed/           → train/test/val scaled CSV files
ml/models/                → All trained models + configuration
  ├─ isolation_forest.pkl
  ├─ autoencoder.keras
  ├─ scaler_13.pkl
  ├─ ensemble_config.pkl
  └─ current.json
logs/                     → Audit trails
```

### ✓ Backend Ready For
- Real-time access decision making
- Anomaly detection with confidence scores
- Decision explainability
- API performance monitoring
- Database performance tracking

### ✓ Test The System
1. Open http://localhost:3000
2. Go to "Simulator" page
3. Submit test access requests
4. View generated alerts
5. Check decision explanations
6. Monitor ML health status

---

## Which Script Should I Use?

### Choose `run_full_pipeline.py` if:
- ✓ First time setting up RaptorX
- ✓ You want it to "just work"
- ✓ You prefer automated progress reporting
- ✓ You don't need to inspect intermediate results

### Choose `run_pipeline_interactive.py` if:
- ✓ You want to pause between steps
- ✓ You want to inspect intermediate artifacts
- ✓ You want to run specific steps only
- ✓ You're debugging or experimenting

### Choose `startup.py` if:
- ✓ You prefer a menu-driven interface
- ✓ You want one entry point for everything
- ✓ You want to quickly verify models
- ✓ You want easy backend startup

---

## Example Workflow

### Complete First-Time Setup (45-90 min)

```powershell
# Terminal 1: Run pipeline
PS E:\RAPTORX> python run_full_pipeline.py

# [Watches progress for 45-90 minutes]
# ✓ Step 1: Generate data - DONE
# ✓ Step 2: Prepare data - DONE
# ✓ Step 3: Train IF - DONE
# ✓ Step 4: Train AE - DONE
# ✓ Step 5: Ensemble - DONE
# ✓ Step 6: Thresholds - DONE
# ✓ Step 7: Quick test - DONE
# ✓ Step 8: Thread test - DONE
# ✓ Step 9: Validate - DONE

# ✓ Pipeline completed successfully!

# Terminal 2: Start backend (when pipeline is done)
PS E:\RAPTORX> cd backend
PS E:\RAPTORX\backend> uvicorn app.main:app --reload --port 8000
# INFO: Uvicorn running on http://127.0.0.1:8000

# Terminal 3: Start frontend (when backend is ready)
PS E:\RAPTORX\frontend> npm run dev
# ready - started server on 0.0.0.0:3000

# Browser: http://localhost:3000
# ✓ Dashboard loads
# ✓ All models are loaded
# ✓ Ready to test!
```

---

## Key Features

### ✓ Automated Error Handling
- Detects missing files before running
- Catches failures and reports them clearly
- Provides troubleshooting suggestions

### ✓ Progress Tracking
- Shows which step is running
- Displays elapsed time per step
- Real-time output from each step
- Summary at the end

### ✓ Comprehensive Verification
- Checks all prerequisites
- Verifies output artifacts after completion
- Confirms models are ready for backend

### ✓ Flexible Options
- Run everything at once
- Run with pauses for inspection
- Run individual steps
- Verify without retraining

---

## Monitor the Pipeline

### Real-Time Output
Each step shows:
- Script being executed
- Timeout limit
- Real-time progress from the script
- Success/failure status
- Elapsed time

### Final Summary Shows
```
========== PIPELINE EXECUTION SUMMARY ==========

Total Duration: 3847.5s (64.1 minutes)

PASSED STEPS:
  [1] Generate Synthetic Data                    847.1s
  [2] Explore & Prepare Data                     284.3s
  [3] Train Isolation Forest                     612.4s
  [4] Train Autoencoder                        1205.7s
  [5] Compare & Ensemble                         381.2s
  [6] Retune Thresholds                          145.8s
  [7] Quick Validation Test                       62.1s
  [8] Thread Safety Test                         238.4s
  [9] Full System Validation                     187.6s
```

---

## Troubleshooting

### "Cannot find script" Error
→ Ensure you're in the workspace root: `e:\RAPTORX`

### Out of Memory
→ Close other applications, especially if training Autoencoder
→ Edit step 4 timeout if needed: increase from 900 to 1800 seconds

### Pipeline Stops Mid-Way
→ Check the error output
→ See `PIPELINE_SCRIPTS.md` for detailed troubleshooting

### Models Not Found After Completion
→ Run: `python run_pipeline_interactive.py`
→ Choose option [4] to verify artifacts

### Backend Won't Start
→ Check if port 8000 is already in use
→ Verify PostgreSQL is running
→ Check `backend/.env` DATABASE_URL

---

## Documentation Files

Three guides are now available:

1. **PIPELINE_QUICKSTART.md** - Quick reference
   - When to use each script
   - What each step does
   - Expected outputs
   - Quick troubleshooting

2. **PIPELINE_SCRIPTS.md** - Full technical documentation
   - Detailed script descriptions
   - All workflow examples
   - Performance optimization
   - Complete troubleshooting guide

3. **This file** - Summary and getting started

---

## What's Next?

### ✅ Immediate Next Steps
1. Choose a runner above
2. Run: `python run_full_pipeline.py` (or your chosen option)
3. Wait for completion (may take 45-90 minutes)
4. Start backend and frontend as shown above
5. Open http://localhost:3000

### ✅ Testing The System
- Use **Simulator** page to test decisions
- Check **Logs** to see decisions with scores
- Review **Alerts** for anomalies detected
- Monitor **ML Status** for model health
- View explanations on **Explainability** page

### ✅ Production Use
- Refer to `CI_CD_GUIDE.md` for automated pipelines
- Check `THREAD_SAFETY.md` for concurrent access info
- Use `EXPLAINABILITY_INTEGRATION.md` for decision transparency

---

## Summary

You now have:
✓ Fully automated ML pipeline with progress tracking
✓ Interactive step-by-step runner with inspection
✓ Unified menu-driven startup system
✓ Complete documentation and troubleshooting guides

**To start**: `python run_full_pipeline.py`

**Status**: Ready for production testing ✓

---

## Questions?

Refer to:
- `PIPELINE_QUICKSTART.md` - Quick answers
- `PIPELINE_SCRIPTS.md` - Detailed info
- `README.md` - Full system docs
- `CI_CD_GUIDE.md` - Deployment guide

---

**Happy Pipeline Running! 🚀**

Created: February 23, 2026
