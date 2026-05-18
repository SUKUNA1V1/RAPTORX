# 🐳 RaptorX Docker Setup Guide

This guide explains how to run RaptorX using Docker and Docker Compose.

## Prerequisites

You need to have installed on your computer:
- **Docker** - [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Docker Compose** (comes with Docker Desktop)

### Verify Installation

```bash
docker --version
docker-compose --version
```

---

## Quick Start (One Command!)

```bash
# Navigate to the project directory
cd raptorx

# Start all services
docker-compose up
```

That's it! 🎉 All services will start automatically.

---

## What Gets Started

When you run `docker-compose up`, you get:

| Service | URL | Purpose |
|---------|-----|---------|
| **PostgreSQL** | localhost:5432 | Database |
| **Redis** | localhost:6379 | Cache layer |
| **Backend API** | http://localhost:8000 | FastAPI application |
| **Frontend** | http://localhost:5173 | React application |
| **API Docs** | http://localhost:8000/docs | Swagger documentation |

---

## Common Commands

### Start Services (Foreground)
```bash
docker-compose up
```

### Start Services (Background)
```bash
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Stop All Services
```bash
docker-compose down
```

### Stop and Remove Data
```bash
docker-compose down -v
```

### Rebuild Images (after code changes)
```bash
docker-compose up --build
```

### Run Command in Container
```bash
# Backend shell
docker-compose exec backend bash

# Create admin user
docker-compose exec backend python create_default_admin.py

# Run database migrations
docker-compose exec backend alembic upgrade head
```

---

## Port Mapping

If you have services running on these ports, change them in `docker-compose.yml`:

| Default | Service | To change |
|---------|---------|-----------|
| 5432 | PostgreSQL | Change `5432:5432` to `5433:5432` |
| 6379 | Redis | Change `6379:6379` to `6380:6379` |
| 8000 | Backend | Change `8000:8000` to `8001:8000` |
| 5173 | Frontend | Change `5173:5173` to `5174:5173` |

---

## Troubleshooting

### Ports Already in Use
```bash
# Windows - Find what's using port 5432
netstat -ano | findstr :5432

# macOS/Linux - Find what's using port 5432
lsof -i :5432

# Solution: Change port in docker-compose.yml
```

### Container Won't Start
```bash
# View error logs
docker-compose logs backend

# Check if port is available
docker ps
```

### Database Connection Error
```bash
# Wait a bit longer for PostgreSQL to start
docker-compose down
docker-compose up

# Or manually trigger migrations
docker-compose exec backend alembic upgrade head
```

### Want Fresh Database
```bash
# Stop and remove volumes (DELETES ALL DATA)
docker-compose down -v

# Start fresh
docker-compose up
```

---

## Environment Variables

Edit `docker-compose.yml` to change:

```yaml
environment:
  POSTGRES_USER: raptorx_user
  POSTGRES_PASSWORD: secure_password_123  # Change this!
  POSTGRES_DB: raptorx
  SECRET_KEY: your-super-secret-key-change-me-in-production
```

---

## File Structure

```
raptorx/
├── Dockerfile              # Backend container
├── frontend/
│   └── Dockerfile          # Frontend container
├── docker-compose.yml      # Orchestration config
├── .dockerignore           # Files to exclude from build
├── backend/                # Your backend code
├── frontend/               # Your frontend code
└── DOCKER_SETUP.md         # This file
```

---

## Production Considerations

For production deployment, you should:

1. **Change SECRET_KEY** - Use a strong random value
2. **Change Database Password** - Use secure credentials
3. **Use environment variables** - Don't hardcode secrets
4. **Enable HTTPS** - Use nginx with SSL certificates
5. **Set DEBUG=false** - Already done in docker-compose.yml
6. **Use proper logging** - Setup log aggregation

---

## Next Steps

1. ✅ Run `docker-compose up`
2. ✅ Open http://localhost:5173 in your browser
3. ✅ API docs at http://localhost:8000/docs
4. ✅ Check logs: `docker-compose logs -f`

**Questions?** Check the main README.md for project details.

Happy containerizing! 🚀
