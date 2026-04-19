# Phase 2 Deployment Instructions

**Quick Start Guide for Phase 2 (HIGH-Priority Fixes)**

---

## Prerequisites

- Python 3.10+ virtual environment activated
- PostgreSQL 14+ running and accessible
- Backend dependencies installed (`pip install -r backend/requirements.txt`)
- Git repository ready

---

## Step 1: Deploy Database Indexes (Alembic Migration)

### Run the migration:
```bash
cd backend
alembic upgrade head
```

**Expected Output:**
```
INFO  [alembic.runtime.migration] Running upgrade security_001_add_security_features -> phase2_001_add_performance_indexes
INFO  [alembic.migration] Running upgrade phase2_001_add_performance_indexes
```

### Verify indexes were created:
```bash
psql -U postgres -d raptorx -c "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'ix_%' ORDER BY indexname;"
```

**Expected indexes:**
```
ix_access_logs_user_id_timestamp
ix_anomaly_alerts_user_created
ix_audit_log_timestamp
ix_login_attempts_email_timestamp
ix_users_badge_id
```

### (Optional) Rollback if needed:
```bash
alembic downgrade -1
```

---

## Step 2: Update Environment Configuration

### Create .env file if not exists:
```bash
cp .env.example .env
```

### Edit .env with your values:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/raptorx

# Security
SECRET_KEY=your-secret-key-here-32-chars-minimum
DEFAULT_ADMIN_PASSWORD=your-strong-password-8-chars-minimum
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# ML/Decision Engine
DECISION_THRESHOLD_GRANT=0.30
DECISION_THRESHOLD_DENY=0.70
RETRAIN_FREQUENCY_DAYS=40
```

---

## Step 3: Test Backend

### Syntax verification:
```bash
cd backend
python -m py_compile app/services/ml_service.py app/services/decision_engine.py app/main.py app/middleware/csrf.py
```

**Expected:** No output = success ✓

### Start development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Test health endpoint:
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{"status":"ok"}
```

---

## Step 4: Test Performance Improvements

### Benchmark access decision endpoint:
```bash
# From new terminal
curl -X POST http://localhost:8000/api/access/decide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"badge_id":"E001","access_point_id":1,"timestamp":"2026-04-19T14:30:00Z","method":"badge"}'
```

**Expected Latency:** 50-100ms (down from 400-900ms)

### Performance test with Apache Bench:
```bash
# Install: apt-get install apache2-utils
ab -n 100 -c 10 http://localhost:8000/health
```

**Expected:** Significant improvement in throughput

---

## Step 5: Test CSRF Protection

### Get CSRF token (to be implemented):
```bash
# This endpoint needs to be added to auth router
curl http://localhost:8000/api/auth/csrf-token
```

### Test CSRF validation on protected endpoint:
```bash
# Without token (should return 403 Forbidden)
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# With token (should work)
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: VALID_TOKEN_HERE" \
  -d '{"email":"test@test.com","password":"password123"}'
```

---

## Step 6: Frontend Integration

### Update API client to include CSRF token:

**File: `frontend/src/services/api.ts` (or similar)**

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Get CSRF token on app load
async function initializeCSRFToken() {
    try {
        const response = await axios.get(`${API_BASE_URL}/auth/csrf-token`);
        const csrfToken = response.data.csrf_token;
        
        // Store in session or state
        sessionStorage.setItem('csrf_token', csrfToken);
        
        return csrfToken;
    } catch (error) {
        console.error('Failed to get CSRF token:', error);
    }
}

// Create axios instance with CSRF token interceptor
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add CSRF token to all requests
apiClient.interceptors.request.use((config) => {
    const csrfToken = sessionStorage.getItem('csrf_token');
    if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase())) {
        config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
});

// Initialize on app start
initializeCSRFToken();

export default apiClient;
```

### Build frontend:
```bash
cd frontend
npm run build
```

**Expected:** Build completes successfully in ~20 seconds

---

## Step 7: Full System Test

### 1. Start backend:
```bash
cd backend
uvicorn app.main:app --reload
```

### 2. Start frontend (new terminal):
```bash
cd frontend
npm run dev
```

### 3. Open browser:
```
http://localhost:5173
```

### 4. Login and test:
- [ ] Admin login successful
- [ ] Dashboard loads quickly
- [ ] Access decision endpoint responds in < 100ms
- [ ] UI operations create CSRF tokens
- [ ] No console errors

### 5. Check logs for new logging:
- [ ] Audit logging appears in logs
- [ ] Exception handling logs visible
- [ ] No silent failures

---

## Step 8: Database Query Performance Verification

### Check query plans before/after:
```bash
psql -U postgres -d raptorx

-- Check if new indexes are used
EXPLAIN ANALYZE
SELECT COUNT(*) FROM access_logs 
WHERE user_id = 1 AND timestamp >= NOW() - INTERVAL '24 hours';

-- Compare with old query plan (should show index usage now)
```

**Expected:** `Index Scan` on `ix_access_logs_user_id_timestamp` instead of `Seq Scan`

---

## Troubleshooting

### Issue: Alembic migration fails
**Solution:** Check that database connection is working
```bash
psql -U postgres -d raptorx -c "SELECT version();"
```

### Issue: CSRF token validation errors
**Solution:** Ensure X-CSRF-Token header is being sent correctly
```bash
curl -i -X POST http://localhost:8000/api/users \
  -H "X-CSRF-Token: test" \
  -d '{}'
```

### Issue: Performance still slow
**Solution:** Verify indexes were created
```bash
psql -U postgres -d raptorx -c "SELECT * FROM pg_stat_user_indexes WHERE indexname LIKE 'ix_%';"
```

### Issue: Backend won't start
**Solution:** Check Python syntax
```bash
python -m py_compile backend/app/services/ml_service.py
```

---

## Rollback Procedure

If issues occur, rollback is simple:

### 1. Revert database migration:
```bash
cd backend
alembic downgrade -1
```

### 2. Revert code changes:
```bash
git checkout backend/app/services/ml_service.py
git checkout backend/app/services/decision_engine.py
git checkout backend/app/main.py
git checkout backend/app/middleware/csrf.py
```

### 3. Restart backend

---

## Performance Verification Checklist

- [ ] Database migration successful
- [ ] New indexes created in PostgreSQL
- [ ] Backend starts without errors
- [ ] Access decision latency < 150ms
- [ ] CSRF validation working (403 without token)
- [ ] Frontend builds successfully
- [ ] Dashboard loads and displays data
- [ ] No console or server errors

---

## Post-Deployment Monitoring

### Key metrics to monitor:
1. **Access Decision Latency** (target: < 150ms P95)
2. **Database Query Performance** (use `EXPLAIN ANALYZE`)
3. **CSRF Error Rate** (should be < 1% of requests)
4. **Exception Logs** (new logging for audit/hash failures)
5. **Connection Pool Usage** (should be lower than before)

### Set up alerts for:
- P95 latency > 200ms
- CSRF error rate > 5%
- Database connection pool > 80%
- Audit logging failures
- Unhandled exceptions

---

## Success Indicators

✅ Deployment is successful when:
- All database indexes created
- Access decision latency 50-100ms
- CSRF protection active
- No silent failures (all logged)
- Performance improved 80%+ over baseline
- Zero breaking changes to API

---

**Estimated Deployment Time:** 30-45 minutes  
**Downtime Required:** < 5 minutes (for database migration)  
**Risk Level:** LOW

