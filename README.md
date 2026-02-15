
# RaptorX

RaptorX is a full-stack AI access control system with a FastAPI backend and a Next.js dashboard. It ingests access events, evaluates risk with an ensemble decision engine, logs decisions, and surfaces alerts and analytics in a modern operations UI.

## Features

- Real-time access decisioning (rule-based + ML ensemble)
- Access logs with filtering, pagination, and risk scores
- Anomaly alerts with severity tracking and resolution flow
- Live dashboard metrics and charts
- Access request simulator
- ML status and model health reporting

## Tech Stack

### Frontend

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4 + tw-animate-css
- Recharts for charts
- Axios for API calls
- Lucide icons
- clsx + tailwind-merge for class composition

### Backend

- FastAPI
- Uvicorn ASGI server
- SQLAlchemy ORM
- Alembic migrations
- Pydantic + pydantic-settings
- python-dotenv for local env support
- CORS configured for http://localhost:3000

### ML / Data

- TensorFlow 2.20.0 (autoencoder)
- scikit-learn (isolation forest)
- numpy, pandas, joblib
- Model artifacts stored under ml/

### Database

- SQL database via SQLAlchemy
- psycopg2-binary included for Postgres
- Connection configured via DATABASE_URL

## Repository Structure

- frontend/            Next.js dashboard
- backend/             FastAPI service
- ml/                  Trained models and results
- data/                Raw and processed datasets
- iot-simulator/       Badge scan simulator
- tests/               Test stubs

## Architecture Overview

1. Frontend calls backend APIs via axios (frontend/src/lib/api.ts).
2. Backend validates requests, queries DB, and computes ML scores.
3. Access decisions are stored as AccessLog records.
4. Anomalies can create AnomalyAlert entries.
5. Dashboard aggregates stats from AccessLog and AnomalyAlert tables.

## Key Backend Components

- app/main.py: FastAPI app and middleware (CORS, exception handler)
- app/routes/*: REST endpoints
- app/models/*: SQLAlchemy models
- app/services/*: Decision engine, ML service, feature extraction
- alembic/: Database migrations

## Core Models (High-Level)

- User: identity, role, department, clearance, active status
- AccessPoint: location, clearance, status
- AccessLog: timestamp, decision, risk score, method, feature context
- AnomalyAlert: alert type, severity, status, confidence, resolution

## ML Pipeline (High-Level)

- Feature extraction at request time
- Isolation Forest and Autoencoder scores combined into an ensemble risk score
- Decision thresholds determine granted / delayed / denied

## Decision Thresholds

- Grant threshold: default 0.3
- Deny threshold: default 0.7
- See backend/app/config.py for defaults

## Quick Start

### 1) Backend

From the repository root:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

### Frontend

Create frontend/.env.local if you want to override the API base URL:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend

Backend configuration is managed in backend/app/config.py and environment variables (if present). Common values include:

- DATABASE_URL
- SECRET_KEY
- DECISION_THRESHOLD_GRANT
- DECISION_THRESHOLD_DENY
- ML_MODEL_PATH
- AUTOENCODER_MODEL_PATH

## API Overview

Base URL: http://localhost:8000

Health:

- GET /health

Stats:

- GET /api/stats/overview
- GET /api/stats/access-timeline
- GET /api/stats/anomaly-distribution
- GET /api/stats/top-access-points

Access:

- POST /api/access/request
- GET /api/access/logs
- GET /api/access/logs/{id}

Alerts:

- GET /api/alerts
- PUT /api/alerts/{id}/resolve
- PUT /api/alerts/{id}/false-positive

Users:

- GET /api/users
- POST /api/users
- PUT /api/users/{id}

Access Points:

- GET /api/access-points

ML:

- GET /api/ml/status

## Frontend Pages

- /dashboard        KPI overview and charts
- /logs             Access logs with risk scores
- /alerts           Anomaly alerts
- /users            User management
- /simulator        Access request simulator
- /ml-status        Model health and configuration

## Data and Models

- data/raw contains source CSVs
- data/processed contains scaled train/test sets
- ml/models contains trained model artifacts

## Migrations

Alembic is included in backend/alembic. Typical workflow:

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

Ensure DATABASE_URL is set before running migrations.

## Troubleshooting

- 404 on frontend API calls: ensure backend is running on port 8000
- CORS issues: backend allows http://localhost:3000
- Empty charts: load seed data or generate sample logs
- Simulator demo mode: backend unreachable or request failed
- 404 for access points: ensure /api/access-points is live and backend is restarted
- Missing risk scores: ensure AccessLog.risk_score is populated

## Scripts

Backend:

- uvicorn app.main:app --reload --port 8000

Frontend:

- npm run dev
- npm run build
- npm run start

## Development Notes

- Frontend uses client-side data fetching with loading and error states
- UI falls back to mock data if API is down or returns empty
- Most UI styles are Tailwind classes with global overrides in frontend/src/app/globals.css

## Security Notes

- No auth is configured by default
- Add auth middleware if exposing beyond local dev

## License

Internal project. Add a license if distribution is required.

