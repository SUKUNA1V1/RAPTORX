# Database Integration - Quick Reference

## ✅ What's Done

Your RaptorX pipeline now automatically saves all generated data to PostgreSQL.

## 📊 The New Step

**Step 2: Load Data to Database** (5-10 minutes after data generation)
- Reads 500k records from CSV
- Creates 500 users with profiles
- Creates 8 access points (zones)
- Inserts all access logs to database
- Handles duplicates automatically

## 📁 Key Files

```
scripts/run_full_pipeline.py     ← Updated (10 steps)
scripts/run_pipeline_interactive.py ← Updated (10 steps)
explore_database.py              ← New: exploration tool
docs/DATABASE_INTEGRATION.md     ← New: complete guide
```

## 🚀 Quick Start

```bash
# Run the pipeline (data auto-loads to DB)
python run_pipeline.py

# After completion (~70 min), explore data:
python explore_database.py

# Or via backend API:
cd backend
uvicorn app.main:app --reload
# Visit: http://localhost:8000/api/logs
```

## 📈 Data in Database

| Table | Records | Purpose |
|-------|---------|---------|
| users | 500 | User profiles with roles/depts |
| access_points | 8 | Entry points per zone |
| access_logs | 500,000 | All access events with features |

## 🔍 Explore Options

### Option 1: Python Script (Simplest)
```bash
python explore_database.py
```
Shows: stats, departments, top users, anomalies, hourly patterns

### Option 2: Backend API
```bash
cd backend && uvicorn app.main:app --reload
curl http://localhost:8000/api/logs?limit=10
```

### Option 3: Frontend Dashboard
```bash
cd frontend && npm run dev
# Opens at http://localhost:3000
```

### Option 4: Direct SQL
```bash
psql <database_url>
SELECT COUNT(*) FROM access_logs;
SELECT decision, COUNT(*) FROM access_logs GROUP BY decision;
```

## 📋 What Gets Created

### Users (sample data, auto-generated)
- Badge IDs: BADGE_000000 to BADGE_000499
- Departments: engineering, hr, finance, marketing, logistics, it
- Roles: Staff (level 1), Manager (level 2-3)
- All linked to access logs

### Access Points (by zone)
- engineering_entry, hr_entry, etc.
- Clearance requirements
- Restricted: server_room, executive

### Access Logs (500k records)
- Complete feature set from CSV
- Timestamps: past 30 days
- Decision: approved/flagged (based on anomaly)
- Risk scores: 0.0-1.0
- JSONB context with extra metadata

## 🎯 Pipeline Timeline

| Step | Duration |
|------|----------|
| 1. Generate Data | 50-60m |
| **2. Load Database** | **5-10m** ✨ NEW |
| 3-10. Training | ~15-20m |
| **TOTAL** | **65-90m** |

## ❓ Common Questions

**Q: Can I re-run the pipeline?**
A: Yes! The script detects existing data and skips insertion to prevent duplicates.

**Q: How do I clear the database?**
A: SQL: `DELETE FROM access_logs; DELETE FROM users; DELETE FROM access_points;`

**Q: Can I access data without the backend?**
A: Yes! Use `explore_database.py` or connect directly to PostgreSQL.

**Q: What if pipeline fails?**
A: Check logs in console. Common issues: PostgreSQL not running, wrong DATABASE_URL in .env

**Q: Are there sample queries?**
A: Yes! See `explore_database.py` and `docs/DATABASE_INTEGRATION.md`

## 📚 Full Documentation

See `docs/DATABASE_INTEGRATION.md` for:
- Complete schema reference
- SQL query examples
- API endpoint details
- Troubleshooting guide
- Performance tips

## ✨ Key Features

✓ Automatic user/access point creation
✓ Batch insertion for speed
✓ Duplicate detection
✓ JSONB metadata storage
✓ Proper relationships (user_id, access_point_id)
✓ Timestamp distribution (30 days)
✓ Risk scoring (based on anomalies)
✓ Ready for API/frontend consumption

## 🎬 Ready to Go!

All systems configured and verified. Generated data is now database-backed.

```bash
python run_pipeline.py
```

After ~70 minutes:
```bash
python explore_database.py
```

---

**Status**: ✅ Complete and Ready
