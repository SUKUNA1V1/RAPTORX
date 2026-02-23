# Database Integration - Implementation Summary

## Overview

Your RaptorX pipeline now saves all generated synthetic data to the PostgreSQL database, making it accessible for exploration through APIs, dashboards, and direct queries.

## What Was Added

### 1. New Pipeline Step
**File**: `scripts/load_data_to_db.py`

Features:
- ✓ Reads generated CSV data from `data/raw/train.csv`
- ✓ Creates 500 sample users with realistic profiles
- ✓ Creates 8 access points (one per zone)
- ✓ Loads all 500,000 access logs into database
- ✓ Maps synthetic features to database schema
- ✓ Prevents duplicate data insertion
- ✓ Batch-inserts for performance (5000 records per batch)

### 2. Updated Pipeline Scripts
- `scripts/run_full_pipeline.py` - Now 10 steps (added step 2)
- `scripts/run_pipeline_interactive.py` - Now 10 interactive steps (added step 2)
- `verify_setup.py` - Checks for new script

### 3. Documentation
- `docs/DATABASE_INTEGRATION.md` - Complete integration guide
- `explore_database.py` - Example query script

## Data Flow

```
Generate Data (10 min)
    ↓ (CSV)
Load to Database (5-10 min) ← NEW
    ↓ (500k records in DB)
Prepare Data (from DB)
    ↓
Train Models
    ↓
Validation & Testing
```

## Pipeline Execution

### Automatic Data Population

1. **Users** (500 total)
   - Spread across 6 departments
   - Clearance levels 1-3
   - Realistic role assignments
   - Active status

2. **Access Points** (8 total)
   - One entry per zone
   - Restricted zones: server_room, executive
   - Clearance requirements matching data

3. **Access Logs** (500,000 total)
   - Timestamp range: last 30 days
   - Decision: approved/flagged (based on anomaly label)
   - Risk scores: 0.0-1.0 (higher for anomalies)
   - All feature columns mapped

## Exploring the Data

### Method 1: Backend API
```bash
# Requires backend running on port 8000
curl http://localhost:8000/api/logs
```

### Method 2: Dashboard
```bash
# Frontend displays data automatically
npm run dev  # in frontend directory
```

### Method 3: Direct Queries
```bash
# Run exploration script
python explore_database.py
```

### Method 4: SQL Client
Connect to PostgreSQL and query directly:
```sql
SELECT * FROM access_logs LIMIT 10;
```

## Key Features

✓ **Automatic Data Mapping**
- Synthetic features → Database columns
- User and access point relationships maintained
- JSONB context field for additional metadata

✓ **Smart Insertion**
- Detects existing data (no duplicates)
- Batch processing for speed
- Progress tracking

✓ **Complete Integration**
- Works with existing backend API
- Compatible with frontend dashboard
- No schema changes needed

✓ **Exploration Tools**
- Built-in query examples
- Statistics script provided
- Easy to extend with custom queries

## Quick Start

1. **Run Pipeline**
   ```bash
   python run_pipeline.py
   ```
   Expected time: 65-80 minutes

2. **After Completion** (database is auto-populated)

3. **Explore Data**
   ```bash
   python explore_database.py
   ```

4. **View in Backend**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   # Visit http://localhost:8000/api/logs
   ```

5. **View in Frontend**
   ```bash
   cd frontend
   npm run dev
   # Visit http://localhost:3000
   ```

## Database Schema Details

### AccessLog Columns
- **id**: Primary key
- **user_id**: Foreign key to users
- **access_point_id**: Foreign key to access_points
- **timestamp**: When access occurred
- **decision**: "approved" or "flagged"
- **risk_score**: 0.0-1.0 (higher = more anomalous)
- **Features**: hour, day_of_week, location_match, etc.
- **context**: JSONB with geographic_impossibility, velocity, etc.

### User Columns
- **id**: Primary key
- **badge_id**: Unique badge identifier
- **first_name, last_name**: Names
- **email**: Contact
- **role**: "Manager" or "Staff"
- **department**: engineering, hr, finance, etc.
- **clearance_level**: 1-3
- **is_active**: Active/inactive status

### AccessPoint Columns
- **id**: Primary key
- **name**: Point identifier (e.g., "ENGINEERING_ENTRY")
- **zone**: Corresponding zone
- **type**: "badge_reader"
- **is_restricted**: boolean
- **required_clearance**: 1-3

## Troubleshooting

### Database Connection Failed
- Ensure PostgreSQL is running
- Check `.env` for DATABASE_URL
- Verify credentials
- Test connection: `psql <database_url>`

### No Data in Database
- Check pipeline completed without errors
- Verify load_data_to_db.py ran (step 2)
- Check database permissions
- Look at logs for errors

### Performance Issues
- First insert is slowest (indexes building)
- Subsequent queries are faster
- Queries block during batch insert
- Adjusting BATCH_SIZE can help

### Duplicate Data
- Script auto-detects and skips if data exists
- To reimport: Clear tables first
  ```sql
  DELETE FROM access_logs;
  DELETE FROM users;
  DELETE FROM access_points;
  ```

## Advanced Usage

### Custom Queries
Edit `explore_database.py` to add custom SQL queries for your analysis:
```python
# Example: Find suspicious users
top_anomalies = session.execute(
    text("""
    SELECT u.badge_id, COUNT(*) as flag_count
    FROM access_logs al
    JOIN users u ON al.user_id = u.id
    WHERE al.decision = 'flagged'
    GROUP BY u.id
    ORDER BY flag_count DESC
    LIMIT 10
    """)
)
```

### Database Backup
```sql
pg_dump <database_name> > backup.sql
```

### Performance Monitoring
```sql
SELECT relname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Files Summary

| File | Purpose |
|------|---------|
| `scripts/load_data_to_db.py` | Main database loading logic |
| `scripts/run_full_pipeline.py` | Updated: 10 steps with DB insert |
| `scripts/run_pipeline_interactive.py` | Updated: 10 interactive steps |
| `explore_database.py` | Statistics and exploration script |
| `docs/DATABASE_INTEGRATION.md` | Complete guide |
| `verify_setup.py` | Updated: checks for new script |

## Status

✅ **COMPLETE**

All systems integrated and ready to use. Generated data is now database-backed for easy exploration and analysis.

---

**Next Step**: Run `python run_pipeline.py` to generate data and populate database! 🚀
