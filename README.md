# Task Tracker

A task management app with React + Redux Toolkit frontend and FastAPI + SQLite backend, featuring JWT authentication.

## Prerequisites

- Python 3.10+
- Node.js 18+

## Setup

### Backend

```bash
cd backend
cp .env.example .env      # Edit JWT_SECRET for production
pip install -r requirements.txt
uvicorn main:app --reload
```

API runs at `http://localhost:8000` — interactive docs at `/docs`.

### Frontend

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173/task-tracker/`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `dev-secret-key-change-in-production` | Secret key for signing JWT tokens |
| `DATABASE_URL` | `sqlite:///./tasks.db` | Database connection URL |

## Running Tests

### Backend

```bash
cd backend
pip install pytest httpx
pytest
```

### Frontend

```bash
npm test           # single run
npm run test:watch # watch mode
```

## Architecture

- **Frontend:** React 19, Redux Toolkit (createAsyncThunk), TypeScript, react-spring
- **Backend:** FastAPI, SQLAlchemy, SQLite
- **Auth:** JWT-based with bcrypt password hashing
- **Data flow:** One API call per action — mutations sync via server response, no full-list refetches
