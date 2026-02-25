# Database Integration Guide

## Overview

The improved RaptorX pipeline now automatically saves generated synthetic data to the database, making it easy to explore and analyze the data directly through the backend API.

## What Changed

### New Pipeline Step
- **Step 2**: "Load Data to Database" (`scripts/load_data_to_db.py`)
- Runs automatically after data generation
- Imports generated CSV data into PostgreSQL
- Creates sample users and access points automatically

## Database Schema

### Tables Created/Used

**Users Table**
```sql
- id (Primary Key)
- badge_id (unique identifier)
- first_name
- last_name
- email
- phone
- role (Manager, Staff)
- department (engineering, hr, finance, etc.)
- clearance_level (1-3)
- is_active
- created_at
- updated_at
- last_seen_at
```

**AccessPoints Table**
```sql
- id (Primary Key)
- name (e.g., "ENGINEERING_ENTRY")
- type (badge_reader)
- building
- floor
- room
- zone (corresponds to department zones)
- status (active)
- required_clearance (1-3)
- is_restricted (boolean)
- ip_address
- installed_at
- description
```

**AccessLogs Table**
```sql
- id (Primary Key)
- user_id (FK → Users)
- access_point_id (FK → AccessPoints)
- timestamp (when access occurred)
- decision (approved/flagged)
- risk_score (0.0 - 1.0)
- method (badge)
- hour, day_of_week, is_weekend
- access_frequency_24h
- time_since_last_access_min
- location_match (boolean)
- role_level (1-3)
- is_restricted_area (boolean)
- is_first_access_today (boolean)
- sequential_zone_violation (boolean)
- access_attempt_count
- time_of_week
- hour_deviation_from_norm
- badge_id_used
- context (JSONB with additional features)
```

## Features

### Automatic Data Population
1. **Sample Users**: Creates 500 users with realistic:
   - Department assignments
   - Role levels (junior, mid, senior)
   - Clearance assignments
   - Active status

2. **Access Points**: Creates entry points for each zone:
   - engineering, hr, finance, marketing, logistics, it
   - server_room (restricted)
   - executive (restricted)

3. **Access Logs**: Loads all 500k generated records with:
   - Proper user and access point mappings
   - Timestamp distribution (last 30 days)
   - Decision status based on anomaly labels
   - Risk scores for anomalies
   - All feature columns

### Smart Duplicate Prevention
- Checks for existing data before insert
- Skips insertion if data already in database
- Allows re-running pipeline without data duplication

## Exploring the Data

### Via Backend API

**Get Recent Access Logs**
```bash
curl http://localhost:8000/api/access/logs
```

**Filter by User**
```bash
curl http://localhost:8000/api/access/logs?user_id=1
```

**Get Flagged Anomalies**
```bash
curl http://localhost:8000/api/access/logs?decision=denied
```

### Via Dashboard

The frontend automatically connects to these API endpoints and displays:
- Recent access logs table
- Access point status
- User activity statistics
- Risk score distributions
- Timeline of anomalies

### Via Direct Database Query

```sql
-- Count by decision
SELECT decision, COUNT(*) as count 
FROM access_logs 
GROUP BY decision;

-- Average risk score by zone
SELECT ap.zone, AVG(al.risk_score) as avg_risk
FROM access_logs al
JOIN access_points ap ON al.access_point_id = ap.id
GROUP BY ap.zone
ORDER BY avg_risk DESC;

-- Users with flagged access
SELECT DISTINCT u.badge_id, u.first_name, u.last_name, COUNT(*) as flag_count
FROM access_logs al
JOIN users u ON al.user_id = u.id
WHERE al.decision = 'flagged'
GROUP BY u.id, u.badge_id, u.first_name, u.last_name
ORDER BY flag_count DESC;

-- Anomalies by hour
SELECT al.hour, COUNT(*) as anomaly_count
FROM access_logs al
WHERE (al.context->>'is_anomaly')::boolean = true
GROUP BY al.hour
ORDER BY al.hour;
```

## Pipeline Workflow

```
1. Generate Synthetic Data (50-60 min)
   └─> Creates 500k CSV records
   
2. Load to Database (5-10 min)  ← NEW STEP
   ├─> Creates 500 sample users
   ├─> Creates 8 access points
   └─> Inserts 500k access logs
   
3. Explore & Prepare Data
   └─> Uses database data for analysis
   
4-10. Training & Validation
   └─> Models trained on data
```

## Benefits

✓ **Immediate Data Exploration** - Query data right after generation
✓ **Real-time Insights** - Use backend API to view metrics
✓ **Dashboard Visualization** - See data in frontend UI
✓ **No CSV Manipulation** - Work with structured database
✓ **Multi-user Access** - Share data via API
✓ **Built-in Context** - JSONB field for additional features
✓ **Time-based Analysis** - Proper timestamps for temporal queries

## Troubleshooting

### Script Fails to Connect to Database
- Check PostgreSQL is running
- Verify `.env` has correct DATABASE_URL
- Ensure database user has proper permissions
- Check network connectivity

### Duplicate Data Error
- Clear existing data: `DELETE FROM access_logs; DELETE FROM users; DELETE FROM access_points;`
- Or let script detect and skip insertion

### Performance Issues on Insert
- Track progress in console output
- Default batch size: 5000 records
- Adjust BATCH_SIZE in script if needed
- Consider indexing after insert for faster queries

## Next Steps

1. **Run Full Pipeline**: `python run_pipeline.py`
2. **Start Backend**: `cd backend && uvicorn app.main:app --reload`
3. **Explore Data**: Visit `/api/access/logs` endpoint
4. **View Dashboard**: Open frontend in browser
5. **Run Models**: Test trained anomaly detectors on database data

---

**Data is now database-backed and ready for analysis!** 🎉
