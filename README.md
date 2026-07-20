# Task Tracker

A task management application built with **React + Redux Toolkit** (frontend) and **FastAPI + SQLite** (backend), featuring JWT authentication, role-based access control (RBAC), team scoping, activity logging, comments, and a dashboard with charts.

---

## Features

- **Role-based access control** — Admin, Manager, and User roles with granular permissions
- **Team management** — Managers are scoped to their assigned team
- **Task CRUD** — Create, update, assign, and delete tasks with status and priority
- **Comments** — Per-task collaborative commenting with ownership enforcement
- **Activity timeline** — Chronological audit trail for every task
- **Advanced filtering** — Pagination, sorting, search, and multi-dimensional filters
- **Dashboard** — Aggregate stats and donut charts (status / priority)
- **JWT auth** — Dual-token system (short-lived access + httpOnly refresh cookie) with auto-refresh

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Role-Based Access Control](#role-based-access-control)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Auth Flow](#auth-flow)

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Redux Toolkit (`createAsyncThunk`), TypeScript, react-router-dom, recharts, react-spring |
| **Backend** | FastAPI, SQLAlchemy, SQLite, slowapi (rate limiting) |
| **Auth** | JWT (access + refresh tokens) with bcrypt password hashing |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend Setup

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload
```

The API is available at `http://localhost:8000`. Interactive OpenAPI docs at `http://localhost:8000/docs`.

### Frontend Setup

```bash
npm install
npm run dev
```

The application is available at `http://localhost:5173`. The frontend API client targets `http://localhost:8000` by default and the backend CORS middleware permits `http://localhost:5173`.

### Default Admin

On first startup the backend automatically creates a default administrator account:

| Email | Password | Role |
|---|---|---|
| `admin@test.com` | `admin123` | Admin |

Additional users can be created via the Admin panel (*Users → Add User*) or the API. Set `SKIP_DEFAULT_ADMIN=1` in `backend/.env` to disable auto-creation.

---

## Configuration

### Backend Environment Variables

All backend configuration is in `backend/.env`:

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `fallback-dev-secret` | Secret key for signing JWT tokens |
| `DATABASE_URL` | `sqlite:///./tasks.db` | Database connection URL |
| `SKIP_DEFAULT_ADMIN` | — | Set to `1` to skip auto-creating the default admin |
| `SEED_DEMO_DATA` | `NO` | Set to `YES` to seed 2 teams, 14 users, 10 tasks, comments, and activity logs (all passwords: `password123`) |

### Frontend Configuration

The backend base URL is hardcoded in `src/services/api.ts`. Update `BASE_URL` to point at a different backend host.

### Database

By default the application uses **SQLite** (zero-configuration, stored as `backend/tasks.db`).

To use **PostgreSQL** or any SQLAlchemy-supported database, set `DATABASE_URL`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/tasktracker
```

Tables are created automatically on startup via `Base.metadata.create_all`.

#### Schema

| Table | Columns |
|---|---|
| `users` | `id`, `name`, `email`, `hashed_password`, `role` (`Admin`/`Manager`/`User`), `team_id` (nullable FK → `teams.id`), `createdAt` |
| `teams` | `id`, `name`, `createdAt` |
| `tasks` | `id`, `title`, `description`, `status`, `priority`, `dueDate`, `createdAt`, `user_id` (FK), `assigned_to` (nullable FK) |
| `comments` | `id`, `content`, `createdAt`, `task_id` (FK), `user_id` (FK) |
| `activity_logs` | `id`, `action`, `details`, `createdAt`, `task_id` (FK), `user_id` (FK) |

---

## Architecture

### Project Structure

```
task-tracker/
├── backend/
│   ├── main.py              # FastAPI application — route definitions
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py              # JWT creation, decoding, bcrypt helpers
│   ├── dependencies.py      # FastAPI dependencies (get_current_user, require_role)
│   ├── database.py          # SQLAlchemy engine and session factory
│   └── test_main.py         # Integration tests
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ActivityTimeline.tsx
│   │   ├── CommentSection.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TaskList.tsx
│   │   └── UserFormDialog.tsx
│   ├── pages/               # Page-level components
│   │   ├── DashboardPage.tsx
│   │   ├── TaskListPage.tsx
│   │   ├── TaskDetailPage.tsx
│   │   ├── UserManagementPage.tsx
│   │   ├── UserDetailPage.tsx
│   │   └── TeamManagementPage.tsx
│   ├── features/            # Redux Toolkit slices
│   │   ├── auth/            # Login, register, profile, logout
│   │   ├── todo/            # Task CRUD, filters, stats, pagination
│   │   ├── comments/        # Comment CRUD
│   │   ├── activity/        # Activity timeline
│   │   ├── users/           # User CRUD (Admin)
│   │   └── teams/           # Team CRUD (Admin)
│   ├── services/
│   │   └── api.ts           # HTTP client with auto-refresh
│   ├── utils/               # Custom hooks, toast notification helpers
│   ├── types/index.ts       # TypeScript type definitions
│   ├── store.ts             # Redux store configuration
│   └── App.tsx              # Root component with routing
├── package.json
└── vite.config.ts
```

### Data Flow

- Each action issues a single API call; mutations update Redux state from the server response.
- Task lists are fetched server-side with filters, sort, and pagination; results replace the Redux `todos.tasks` array.
- Dashboard stats are fetched independently on the Dashboard page.

### Pages & Routes

| Path | Component | Access | Description |
|---|---|---|---|
| `/` | `DashboardPage` | All | Stat cards, donut charts, recent tasks |
| `/tasks` | `TaskListPage` | All | Filterable, sortable, paginated task list with role-based tabs |
| `/tasks/:id` | `TaskDetailPage` | All | Task detail, status selector, assignment, comments, activity |
| `/users` | `UserManagementPage` | Admin | User list with role management and deletion |
| `/users/:id` | `UserDetailPage` | Admin | User profile and assigned tasks |
| `/teams` | `TeamManagementPage` | Admin | Team CRUD (create, rename, delete) |

---

## Role-Based Access Control

### Role Definitions

| Role | Description |
|---|---|
| **User** | Default role. Views only tasks they created or are assigned to. Can create, update, and delete their own tasks. Cannot assign tasks. |
| **Manager** | Team-scoped role. Views all tasks within their team. Can update any team task, assign tasks to team members, and manage task statuses. Cannot manage users, roles, or teams. |
| **Admin** | Full system access. Can manage users and teams, view and delete any task, assign tasks to any user, and change user roles. |

New users are registered with the **User** role by default. Only an Admin can change a user's role.

### Permission Matrix

| Action | User | Manager | Admin |
|---|---|---|---|
| Create task | ✓ | ✓ | ✓ |
| View own tasks | ✓ | ✓ | ✓ |
| View team tasks | — | ✓ | ✓ |
| View all tasks | — | — | ✓ |
| Update own task | ✓ | ✓ | ✓ |
| Update any task | — | ✓ (team) | ✓ |
| Delete own task | ✓ | ✓ | ✓ |
| Delete any task | — | — | ✓ |
| Assign tasks | — | ✓ (team) | ✓ |
| List users | — | — | ✓ |
| Create / Edit / Delete users | — | — | ✓ |
| Change user roles | — | — | ✓ |
| View / Add comments | ✓ | ✓ | ✓ |
| Delete own comments | ✓ | ✓ | ✓ |
| Delete any comment | — | — | ✓ |
| Manage teams | — | — | ✓ |

---

## API Reference

Interactive documentation is available at `http://localhost:8000/docs`.

### Authentication

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/auth/register` | — | All | Register a new user (defaults to `User` role). Returns `access_token` + sets `refresh_token` httpOnly cookie |
| POST | `/auth/login` | — | All | Authenticate and receive tokens |
| GET | `/auth/profile` | Bearer | All | Current user profile |
| POST | `/auth/refresh` | Cookie | All | Refresh access token. Rotates the refresh token |
| POST | `/auth/logout` | Cookie | All | Clear refresh token cookie |

### Tasks

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/tasks` | Bearer | All | List tasks (paginated, filterable, sortable) |
| GET | `/tasks/stats` | Bearer | All | Aggregated statistics |
| GET | `/tasks/{id}` | Bearer | All | Single task detail |
| POST | `/tasks` | Bearer | All | Create a task |
| PUT | `/tasks/{id}` | Bearer | All | Update a task |
| PATCH | `/tasks/{id}/assign` | Bearer | Admin, Manager | Assign task to a user |
| DELETE | `/tasks/{id}` | Bearer | All | Delete a task |

**Query parameters for `GET /tasks`:**

| Param | Type | Description |
|---|---|---|
| `page` | int (≥1) | Page number |
| `limit` | int (1–100) | Items per page |
| `sort_by` | string | `createdAt`, `dueDate`, `priority`, `title`, `status` |
| `sort_order` | string | `asc` or `desc` |
| `status` | string | `Pending`, `In Progress`, `Done` |
| `priority` | string | `Low`, `Medium`, `High` |
| `q` | string | Search term (matches title and description) |
| `assigned_to` | string | Filter by assignee UUID |
| `user_id` | string | Filter by creator UUID |
| `due_before` | string | ISO date — tasks due on or before this date |
| `due_after` | string | ISO date — tasks due on or after this date |

### Comments

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/tasks/{id}/comments` | Bearer | All | List comments for a task |
| POST | `/tasks/{id}/comments` | Bearer | All | Add a comment |
| DELETE | `/comments/{id}` | Bearer | All | Delete a comment (User: own; Admin: any) |

### Activity

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/tasks/{id}/activity` | Bearer | All | Activity timeline (newest first) |

**Event types:**

| Event | Description |
|---|---|
| `task.created` | Task was created |
| `task.updated` | Task fields were changed |
| `task.assigned` | Task was reassigned |
| `comment.added` | A comment was posted |

### Users (Admin only)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/users` | Bearer | Admin | List all users with task counts |
| GET | `/users/{id}` | Bearer | Admin | Single user with task count |
| POST | `/users` | Bearer | Admin | Create a user |
| PATCH | `/users/{id}` | Bearer | Admin | Update user fields |
| PATCH | `/users/{id}/role` | Bearer | Admin | Change user role |
| DELETE | `/users/{id}` | Bearer | Admin | Delete user and associated data |

### Teams (Admin only)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/teams` | Bearer | Admin | List all teams |
| POST | `/teams` | Bearer | Admin | Create a team |
| GET | `/teams/{id}` | Bearer | Admin | Single team detail |
| PATCH | `/teams/{id}` | Bearer | Admin | Rename a team |
| DELETE | `/teams/{id}` | Bearer | Admin | Delete a team (sets members' `team_id` to null) |

---

## Testing

### Backend

```bash
cd backend
pytest                           # 45 integration tests
```

### Frontend

```bash
npm test                         # 62 tests (single run)
npm run test:watch               # watch mode
npm run build                    # TypeScript check + production build
```

---

## Auth Flow

### Access Token

- Short-lived (30 minutes)
- Returned in the response body during login, register, and refresh
- Stored in memory via `setAccessToken()` — never persisted to localStorage
- Sent as `Authorization: Bearer <token>` header

### Refresh Token

- Long-lived (7 days)
- Set as an **httpOnly cookie** (path: `/auth`) — inaccessible to JavaScript (XSS-safe)
- Sent automatically by the browser on requests to `/auth/refresh`
- Rotated on each successful refresh

### Auto-Refresh

The API client intercepts 401 responses from non-auth endpoints, silently attempts a refresh via `/auth/refresh`, and retries the original request. If the refresh fails, the access token is cleared and the user is redirected to the login prompt.
