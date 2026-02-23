# RaptorX - Folder Structure

Your RaptorX workspace is now organized for clarity and maintainability.

## 📁 Folder Organization

```
e:\RAPTORX\
│
├── 📄 README.md              ← START HERE: Full system documentation
├── 🔧 Core ML Files (at root):
│   ├── decision_engine.py    ← Access decision logic
│   ├── explainability.py     ← Decision explanation module
│   ├── model_registry.py     ← Model artifact management
│   └── threshold_utils.py    ← Threshold resolution utilities
│
├── ▶️ Launcher Scripts (easy to use from root):
│   ├── run_pipeline.py       ← Run full ML pipeline (RECOMMENDED)
│   ├── pipeline_interactive.py ← Interactive step-by-step runner
│   └── startup_menu.py       ← Unified menu for all operations
│
├── 📁 docs/                  ← All documentation
│   ├── START_HERE.md         ← Quick start guide
│   ├── PIPELINE_QUICKSTART.md ← Pipeline reference
│   ├── PIPELINE_SCRIPTS.md   ← Detailed pipeline documentation
│   ├── CI_CD_GUIDE.md        ← Automated deployment pipelines
│   ├── THREAD_SAFETY.md      ← Concurrency details
│   ├── EXPLAINABILITY_INTEGRATION.md
│   └── ... (other documentation)
│
├── 🐍 scripts/               ← All Python training & utility scripts
│   ├── generate_data_fixed.py ← Data generation
│   ├── explore_and_prepare.py ← EDA and scaling
│   ├── train_isolation_forest.py
│   ├── train_autoencoder.py
│   ├── compare_and_ensemble.py
│   ├── retune_threshold.py
│   ├── quick_test.py
│   ├── test_thread_safety.py
│   ├── validate_system.py
│   ├── overfitting_check.py
│   ├── run_full_pipeline.py  ← Full orchestration
│   ├── run_pipeline_interactive.py ← Interactive orchestration
│   ├── startup.py            ← Menu-driven startup
│   └── ci_*.py/.sh           ← CI/CD scripts
│
├── 📦 backend/               ← FastAPI backend (unchanged)
│   ├── app/
│   ├── requirements.txt
│   └── alembic/
│
├── 🎨 frontend/              ← Next.js frontend (unchanged)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
│
├── 📊 data/                  ← Generated datasets
│   └── processed/
│       ├── train_scaled.csv
│       ├── test_scaled.csv
│       └── val_scaled.csv
│
├── 🤖 ml/                    ← Trained models & results
│   ├── models/
│   │   ├── isolation_forest.pkl
│   │   ├── autoencoder.keras
│   │   ├── scaler_13.pkl
│   │   └── current.json
│   └── results/
│
├── 🔗 iot-simulator/         ← API testing simulator
└── 📋 logs/                  ← Application logs
```

## 🚀 Quick Start

### Option 1: Full Automation (RECOMMENDED)
```bash
python run_pipeline.py
```
**Time:** 45-90 minutes. Runs everything automatically.

### Option 2: Interactive Mode
```bash
python pipeline_interactive.py
```
**Time:** 45-90 minutes. Pause between steps, inspect artifacts.

### Option 3: Menu-Driven
```bash
python startup_menu.py
```
**Feature:** Menu for pipeline, backend, frontend, documentation.

## 📍 Where to Find Things

### Documentation
- **Getting Started**: `docs/START_HERE.md`
- **Pipeline Details**: `docs/PIPELINE_QUICKSTART.md` or `docs/PIPELINE_SCRIPTS.md`
- **Full System Docs**: `README.md` (root)
- **CI/CD Pipelines**: `docs/CI_CD_GUIDE.md`
- **Thread Safety**: `docs/THREAD_SAFETY.md`

### Python Scripts
- **Data Generation**: `scripts/generate_data_fixed.py`
- **Training**: `scripts/train_isolation_forest.py`, `scripts/train_autoencoder.py`
- **Ensemble**: `scripts/compare_and_ensemble.py`
- **Threshold Tuning**: `scripts/retune_threshold.py`

### Core ML Components
- **Decision Logic**: `decision_engine.py` (root)
- **Explainability**: `explainability.py` (root)
- **Model Management**: `model_registry.py` (root)
- **Threshold Utils**: `threshold_utils.py` (root)

### Backend & Frontend
- **Backend**: `backend/` directory
- **Frontend**: `frontend/` directory

## ✅ Key Changes

✓ **Cleaner root**: Only essential files at workspace root  
✓ **Organized scripts**: All training/generation scripts in `scripts/`  
✓ **Central docs**: All documentation in `docs/`  
✓ **Easy launchers**: Simple wrapper scripts at root to launch pipeline  
✓ **Preserved structure**: `backend/`, `frontend/`, `data/`, `ml/` unchanged  

## 🔄 File Structure Preserved

All relative paths in scripts still work correctly:
- `data/processed/train_scaled.csv` ✓
- `ml/models/isolation_forest.pkl` ✓
- `logs/access_decisions_audit.log` ✓

The launcher wrappers ensure scripts run from the workspace root, so paths remain consistent.

## 📚 Documentation Reference

| File | Purpose |
|------|---------|
| `README.md` | Complete system documentation |
| `docs/START_HERE.md` | Quick start guide |
| `docs/PIPELINE_QUICKSTART.md` | Pipeline reference |
| `docs/PIPELINE_SCRIPTS.md` | Detailed script documentation |
| `docs/CI_CD_GUIDE.md` | Deployment pipelines |
| `docs/THREAD_SAFETY.md` | Concurrency verification |
| `docs/EXPLAINABILITY_INTEGRATION.md` | Decision explanations |

## 🎯 Next Steps

1. **Read**: `docs/START_HERE.md` (2 min)
2. **Run**: `python run_pipeline.py` (45-90 min)
3. **Test**: Start backend and frontend
4. **Explore**: Dashboard at http://localhost:3000

---

**Structure organized**: February 23, 2026  
**Status**: Ready for production use ✓
