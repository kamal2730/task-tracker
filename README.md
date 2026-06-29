# Task Tracker

A task management app with React + Redux Toolkit frontend and FastAPI + SQLite backend.

## Prerequisites

- Python 3.10+
- Node.js 18+

## Setup

### Backend

```bash
cd backend
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

## Architecture

- **Frontend:** React 19, Redux Toolkit (createAsyncThunk), TypeScript, react-spring
- **Backend:** FastAPI, SQLAlchemy, SQLite
- **Data flow:** One API call per action — mutations sync via server response, no full-list refetches
