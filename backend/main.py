import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import false as sql_false
from sqlalchemy.orm import Session, joinedload
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import engine, Base, SessionLocal, get_db
from models import UserModel, TaskModel, CommentModel, ActivityLogModel, TeamModel, NotificationModel
from schemas import (
    TaskCreate, TaskUpdate, TaskResponse, PaginatedTasksResponse, TaskStatsResponse,
    UserCreate, UserLogin, UserResponse, UserWithStatsResponse,
    UserCreateAdmin, UserUpdateAdmin, UserUpdateRole,
    TokenResponse, CommentCreate, CommentResponse, ActivityLogResponse,
    TeamCreate, TeamResponse, NotificationResponse, PaginatedNotificationsResponse,
)
from auth import (
    hash_password, verify_password,
    create_access_token, decode_access_token,
    create_refresh_token, decode_refresh_token,
)
from dependencies import get_current_user, require_role

Base.metadata.create_all(bind=engine)


def _ensure_default_admin():
    if os.getenv("SKIP_DEFAULT_ADMIN"):
        return
    db = SessionLocal()
    try:
        existing = db.query(UserModel).filter(UserModel.role == "Admin").first()
        if not existing:
            admin = UserModel(
                name="Admin",
                email="admin@test.com",
                hashed_password=hash_password("admin123"),
                role="Admin",
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


_ensure_default_admin()


def _seed_demo_data():
    if os.getenv("SEED_DEMO_DATA", "NO").upper() != "YES":
        return
    db = SessionLocal()
    try:
        existing = db.query(UserModel).filter(
            UserModel.role.in_(["User", "Manager"])
        ).first()
        if existing:
            return

        eng = TeamModel(name="Engineering")
        mkt = TeamModel(name="Marketing")
        db.add_all([eng, mkt])
        db.flush()

        users_data = [
            ("Alice",   "alice@test.com",   "Manager", eng),
            ("Bob",     "bob@test.com",     "Manager", mkt),
            ("Charlie", "charlie@test.com", "Manager", None),
            ("Dave",    "dave@test.com",    "User",    eng),
            ("Eve",     "eve@test.com",     "User",    mkt),
            ("Frank",   "frank@test.com",   "User",    None),
            ("Grace",   "grace@test.com",   "User",    None),
            ("Henry",   "henry@test.com",   "User",    eng),
            ("Ivy",     "ivy@test.com",     "User",    eng),
            ("Jack",    "jack@test.com",    "User",    mkt),
            ("Karen",   "karen@test.com",   "User",    mkt),
            ("Leo",     "leo@test.com",     "User",    None),
            ("Mia",     "mia@test.com",     "User",    None),
            ("Noah",    "noah@test.com",    "User",    None),
        ]
        users = []
        for name, email, role, team in users_data:
            u = UserModel(
                name=name,
                email=email,
                hashed_password=hash_password("password123"),
                role=role,
                team_id=team.id if team else None,
            )
            db.add(u)
            users.append(u)
        db.flush()

        now = datetime.now(timezone.utc)
        tasks_data = [
            ("Fix login bug",     "Users cannot log in with special characters", "In Progress", "High",   "2026-07-25", users[0], users[3]),
            ("Deploy v2.1",       "Deploy the latest release to production",     "Pending",     "High",   "2026-07-30", users[0], None),
            ("Design new logo",   "Create 3 mockups for the rebrand",            "Done",        "Medium", "2026-07-15", users[1], users[4]),
            ("Q3 campaign plan",  "Outline strategy for Q3",                     "In Progress", "Medium", "2026-08-01", users[1], None),
            ("Refactor auth",     "Rewrite auth module with new library",        "Pending",     "Low",    "2026-08-10", users[0], users[7]),
            ("Update docs",       "Update API documentation for new endpoints",  "Done",        "Low",    "2026-07-10", users[2], None),
            ("Fix CI pipeline",   "Build is failing on main branch",             "Pending",     "High",   "2026-06-30", users[5], None),
            ("Add report export", "Export tasks to CSV and PDF",                 "In Progress", "Medium", "2026-08-05", users[1], users[10]),
            ("UI polish",         "Fix spacing and color inconsistencies",       "Pending",     "Low",    "2026-08-15", users[0], users[8]),
            ("Overdue task",      "This should have been done yesterday",        "Pending",     "High",   "2026-07-01", users[5], None),
        ]
        tasks = []
        for i, (title, desc, status, priority, due, creator, assignee) in enumerate(tasks_data):
            t = TaskModel(
                title=title,
                description=desc,
                status=status,
                priority=priority,
                dueDate=due,
                user_id=creator.id,
                assigned_to=assignee.id if assignee else None,
                createdAt=(now - timedelta(hours=len(tasks_data) - i)).isoformat(),
            )
            db.add(t)
            tasks.append(t)
        db.flush()

        comments_data = [
            (0, users[3], "Working on this now, should have a fix by EOD."),
            (0, users[0], "Let me know if you need help debugging."),
            (1, users[0], "Awaiting QA sign-off before deploy."),
            (2, users[4], "All 3 mockups are ready for review."),
            (2, users[1], "Great work, let's go with option B."),
            (3, users[1], "Need input from the analytics team."),
            (4, users[7], "Started the migration, will update the PR."),
            (6, users[5], "The runner is timing out on install step."),
            (8, users[8], "Header colors fixed, checking the footer now."),
        ]
        for j, (ti, user, content) in enumerate(comments_data):
            db.add(CommentModel(
                content=content,
                task_id=tasks[ti].id,
                user_id=user.id,
                createdAt=(now - timedelta(hours=len(comments_data) - j)).isoformat(),
            ))

        activity_data = [
            (0, users[0], "created", "Task created"),
            (0, users[0], "assigned", "Assigned to Dave"),
            (0, users[3], "status_changed", "Moved to In Progress"),
            (1, users[0], "created", "Task created"),
            (2, users[1], "created", "Task created"),
            (2, users[1], "assigned", "Assigned to Eve"),
            (2, users[4], "status_changed", "Moved to Completed"),
            (3, users[1], "created", "Task created"),
            (4, users[0], "created", "Task created"),
            (4, users[0], "assigned", "Assigned to Henry"),
            (5, users[2], "created", "Task created"),
            (6, users[5], "created", "Task created"),
            (7, users[1], "created", "Task created"),
            (7, users[1], "assigned", "Assigned to Jack"),
            (8, users[0], "created", "Task created"),
            (8, users[0], "assigned", "Assigned to Ivy"),
            (9, users[5], "created", "Task created"),
        ]
        for k, (ti, user, action, details) in enumerate(activity_data):
            db.add(ActivityLogModel(
                task_id=tasks[ti].id,
                user_id=user.id,
                action=action,
                details=details,
                createdAt=(now - timedelta(hours=len(activity_data) - k)).isoformat(),
            ))

        db.commit()
    finally:
        db.close()


_seed_demo_data()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Task Tracker API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ────────────────────────────────────────────


def log_activity(
    db: Session,
    task_id: str,
    user_id: str,
    action: str,
    details: str | None = None,
):
    db.add(ActivityLogModel(
        task_id=task_id,
        user_id=user_id,
        action=action,
        details=details,
    ))


def create_notification(
    db: Session,
    recipient_id: str,
    task_id: str | None,
    notif_type: str,
    title: str,
    message: str,
):
    existing = db.query(NotificationModel).filter(
        NotificationModel.recipient_id == recipient_id,
        NotificationModel.task_id == task_id,
        NotificationModel.type == notif_type,
        NotificationModel.is_read == "false",
    ).first()
    if existing:
        return
    db.add(NotificationModel(
        recipient_id=recipient_id,
        task_id=task_id,
        type=notif_type,
        title=title,
        message=message,
    ))


VALID_ROLES = {"Admin", "Manager", "User"}


def _task_to_response(task: TaskModel) -> TaskResponse:
    assignee_name = task.assignee.name if task.assignee else None
    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        dueDate=task.dueDate,
        createdAt=task.createdAt,
        assigned_to=task.assigned_to,
        assigned_to_name=assignee_name,
        user_id=task.user_id,
        user_name=task.user.name,
    )


def _base_task_query(current_user: UserModel, db: Session):
    query = db.query(TaskModel)
    if current_user.role == "User":
        query = query.filter(
            (TaskModel.user_id == current_user.id) | (TaskModel.assigned_to == current_user.id)
        )
    elif current_user.role == "Manager":
        if not current_user.team_id:
            query = query.filter(
                (TaskModel.user_id == current_user.id) | (TaskModel.assigned_to == current_user.id)
            )
        else:
            team_ids = [
                uid for (uid,) in db.query(UserModel.id)
                .filter(UserModel.team_id == current_user.team_id).all()
            ]
            query = query.filter(
                (TaskModel.user_id.in_(team_ids)) | (TaskModel.assigned_to.in_(team_ids))
            )
    return query


# ─── Auth Routes ───────────────────────────────────────


@app.post("/auth/register", status_code=201)
@limiter.limit("100/minute")
def register(
    request: Request,
    payload: UserCreate,
    response: Response,
    db: Session = Depends(get_db),
):
    existing = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = UserModel(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/auth",
    )
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@app.post("/auth/login", status_code=200)
@limiter.limit("100/minute")
def login(
    request: Request,
    payload: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/auth",
    )
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@app.get("/auth/profile", response_model=UserResponse)
def get_profile(current_user: UserModel = Depends(get_current_user)):
    return current_user


@app.post("/auth/refresh", response_model=TokenResponse)
def refresh_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    refresh_token_val = request.cookies.get("refresh_token")
    if not refresh_token_val:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token",
        )
    user_id = decode_refresh_token(refresh_token_val)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    access_token = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/auth",
    )
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@app.post("/auth/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie("refresh_token", path="/auth")
    return


# ─── User Routes (Admin only) ───────────────────────────


@app.get("/users", response_model=list[UserWithStatsResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin", "Manager")),
):
    users = db.query(UserModel).all()
    result = []
    for u in users:
        task_count = db.query(TaskModel).filter(
            (TaskModel.user_id == u.id) | (TaskModel.assigned_to == u.id)
        ).count()
        result.append(UserWithStatsResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            team_id=u.team_id,
            createdAt=u.createdAt,
            task_count=task_count,
        ))
    return result


@app.get("/users/{user_id}", response_model=UserWithStatsResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    task_count = db.query(TaskModel).filter(
        (TaskModel.user_id == user.id) | (TaskModel.assigned_to == user.id)
    ).count()
    return UserWithStatsResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        team_id=user.team_id,
        createdAt=user.createdAt,
        task_count=task_count,
    )


@app.patch("/users/{user_id}/role", status_code=200)
@limiter.limit("100/minute")
def update_user_role(
    request: Request,
    user_id: str,
    payload: UserUpdateRole,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")
    user.role = payload.role
    db.commit()
    return {"detail": f"User role updated to {payload.role}"}


@app.delete("/users/{user_id}", status_code=204)
@limiter.limit("100/minute")
def delete_user(
    request: Request,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.query(TaskModel).filter(TaskModel.assigned_to == user_id).update({"assigned_to": None})
    db.query(NotificationModel).filter(NotificationModel.recipient_id == user_id).delete()
    db.delete(user)
    db.commit()


@app.post("/users", response_model=UserResponse, status_code=201)
@limiter.limit("100/minute")
def create_user(
    request: Request,
    payload: UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    existing = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}",
        )
    if payload.team_id is not None:
        team = db.query(TeamModel).filter(TeamModel.id == payload.team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
    user = UserModel(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        team_id=payload.team_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.patch("/users/{user_id}", response_model=UserResponse)
@limiter.limit("100/minute")
def update_user(
    request: Request,
    user_id: str,
    payload: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.email is not None and payload.email != user.email:
        existing = db.query(UserModel).filter(UserModel.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")
    if payload.role is not None:
        if payload.role not in VALID_ROLES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}",
            )
    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        user.email = payload.email
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    if payload.role is not None:
        user.role = payload.role
    if payload.team_id is not None:
        if payload.team_id == "":
            user.team_id = None
        else:
            team = db.query(TeamModel).filter(TeamModel.id == payload.team_id).first()
            if not team:
                raise HTTPException(status_code=404, detail="Team not found")
            user.team_id = payload.team_id
    elif "team_id" in payload.model_dump(exclude_unset=True) and payload.team_id is None:
        user.team_id = None
    db.commit()
    db.refresh(user)
    return user


# ─── Team Routes (Admin only) ───────────────────────────


@app.get("/teams", response_model=list[TeamResponse])
def get_teams(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    return db.query(TeamModel).order_by(TeamModel.createdAt).all()


@app.post("/teams", response_model=TeamResponse, status_code=201)
@limiter.limit("100/minute")
def create_team(
    request: Request,
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    team = TeamModel(name=payload.name)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@app.get("/teams/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    team = db.query(TeamModel).filter(TeamModel.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@app.patch("/teams/{team_id}", response_model=TeamResponse)
@limiter.limit("100/minute")
def update_team(
    request: Request,
    team_id: str,
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    team = db.query(TeamModel).filter(TeamModel.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    team.name = payload.name
    db.commit()
    db.refresh(team)
    return team


@app.delete("/teams/{team_id}", status_code=204)
@limiter.limit("100/minute")
def delete_team(
    request: Request,
    team_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    team = db.query(TeamModel).filter(TeamModel.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    db.delete(team)
    db.commit()


# ─── Task Routes ────────────────────────────────────────


@app.get("/tasks", response_model=PaginatedTasksResponse)
def get_tasks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    task_status: str | None = Query(None, alias="status"),
    priority: str | None = Query(None),
    q: str | None = Query(None),
    assigned_to: str | None = Query(None),
    user_id: str | None = Query(None),
    due_before: str | None = Query(None),
    due_after: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    query = _base_task_query(current_user, db)

    if task_status:
        query = query.filter(TaskModel.status == task_status)
    if priority:
        query = query.filter(TaskModel.priority == priority)
    if q:
        query = query.filter(
            TaskModel.title.ilike(f"%{q}%") | TaskModel.description.ilike(f"%{q}%")
        )
    if assigned_to:
        query = query.filter(TaskModel.assigned_to == assigned_to)
    if user_id:
        query = query.filter(TaskModel.user_id == user_id)
    if due_before:
        query = query.filter(TaskModel.dueDate <= due_before)
    if due_after:
        query = query.filter(TaskModel.dueDate >= due_after)

    allowed_sort = {"title", "status", "priority", "dueDate", "createdAt"}
    sort_col = getattr(TaskModel, sort_by, None) if sort_by and sort_by in allowed_sort else None
    if sort_col:
        order_fn = sort_col.asc if sort_order == "asc" else sort_col.desc
        query = query.order_by(order_fn())
    else:
        query = query.order_by(TaskModel.createdAt.desc())

    total = query.count()
    pages = max(1, (total + limit - 1) // limit)
    tasks = query.offset((page - 1) * limit).limit(limit).all()

    return PaginatedTasksResponse(
        items=[_task_to_response(t) for t in tasks],
        total=total,
        page=page,
        pages=pages,
    )


@app.get("/tasks/stats", response_model=TaskStatsResponse)
def get_task_stats(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    base_query = _base_task_query(current_user, db)

    by_status = {}
    for s in ["Pending", "In Progress", "Done"]:
        by_status[s] = base_query.filter(TaskModel.status == s).count()

    by_priority = {}
    for p in ["Low", "Medium", "High"]:
        by_priority[p] = base_query.filter(TaskModel.priority == p).count()

    total = base_query.count()

    today = datetime.now(timezone.utc).isoformat()[:10]
    overdue = base_query.filter(
        TaskModel.dueDate.isnot(None),
        TaskModel.dueDate < today,
        TaskModel.status != "Done",
    ).count()

    return TaskStatsResponse(
        byStatus=by_status,
        byPriority=by_priority,
        total=total,
        overdue=overdue,
    )


@app.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    query = _base_task_query(current_user, db)
    task = query.filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_to_response(task)


@app.post("/tasks", response_model=TaskResponse, status_code=201)
@limiter.limit("100/minute")
def create_task(
    request: Request,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    if data.get("assigned_to") and current_user.role == "User":
        data.pop("assigned_to")
    task = TaskModel(**data, user_id=current_user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    log_activity(db, task.id, current_user.id, "task.created", f"Task '{task.title}' created")
    if task.assigned_to and task.assigned_to != current_user.id:
        create_notification(db, task.assigned_to, task.id, "TASK_CREATED", "Task Created", f"You have been assigned to Task: {task.title}.")
    db.commit()
    return _task_to_response(task)


@app.put("/tasks/{task_id}", response_model=TaskResponse)
@limiter.limit("100/minute")
def update_task(
    request: Request,
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    query = _base_task_query(current_user, db)
    task = query.filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "User" and task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot update another user's task")

    update_data = payload.model_dump(exclude_unset=True)
    old_status = task.status
    changed_fields = []
    for key, value in update_data.items():
        if getattr(task, key) != value:
            old_val = getattr(task, key)
            changed_fields.append(f"{key}: '{old_val}' -> '{value}'")
        setattr(task, key, value)
    db.commit()
    db.refresh(task)

    if changed_fields:
        log_activity(
            db, task.id, current_user.id, "task.updated",
            f"Fields changed: {'; '.join(changed_fields)}",
        )

    if "status" in update_data and update_data["status"] != old_status:
        new_status = update_data["status"]
        notif_title = "Task Status Changed"
        notif_msg = f"Task '{task.title}' status changed from {old_status} to {new_status}."
        if task.user_id != current_user.id:
            create_notification(db, task.user_id, task.id, "STATUS_CHANGED", notif_title, notif_msg)
        if task.assigned_to and task.assigned_to != current_user.id and task.assigned_to != task.user_id:
            create_notification(db, task.assigned_to, task.id, "STATUS_CHANGED", notif_title, notif_msg)

    db.commit()

    return _task_to_response(task)


@app.patch("/tasks/{task_id}/assign", response_model=TaskResponse)
@limiter.limit("100/minute")
def assign_task(
    request: Request,
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin", "Manager")),
):
    query = _base_task_query(current_user, db)
    task = query.filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not payload.assigned_to:
        raise HTTPException(status_code=400, detail="assigned_to is required")
    user = db.query(UserModel).filter(UserModel.id == payload.assigned_to).first()
    if not user:
        raise HTTPException(status_code=404, detail="Assigned user not found")
    if current_user.role == "Manager":
        if not current_user.team_id:
            raise HTTPException(
                status_code=400,
                detail="You are not assigned to a team. Contact an administrator.",
            )
        if user.team_id != current_user.team_id:
            raise HTTPException(
                status_code=400,
                detail="Can only assign tasks to users in your team.",
            )
    task.assigned_to = payload.assigned_to
    db.commit()
    db.refresh(task)
    log_activity(
        db, task.id, current_user.id, "task.assigned",
        f"Task assigned to {user.name} ({user.email})",
    )
    if payload.assigned_to != current_user.id:
        create_notification(db, payload.assigned_to, task.id, "TASK_ASSIGNED", "Task Assigned", f"You have been assigned to Task: {task.title}.")
    db.commit()
    return _task_to_response(task)


@app.delete("/tasks/{task_id}", status_code=204)
@limiter.limit("100/minute")
def delete_task(
    request: Request,
    task_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    query = _base_task_query(current_user, db)
    task = query.filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "User" and task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's task")

    db.delete(task)
    db.commit()
    return


# ─── Comment Routes ─────────────────────────────────────


@app.post("/tasks/{task_id}/comments", response_model=CommentResponse, status_code=201)
@limiter.limit("100/minute")
def create_comment(
    request: Request,
    task_id: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    query = _base_task_query(current_user, db)
    task = query.filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = CommentModel(
        content=payload.content,
        task_id=task_id,
        user_id=current_user.id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    log_activity(db, task_id, current_user.id, "comment.added", f"Comment added: {payload.content[:100]}")
    notif_title = "Comment Added"
    notif_msg = f"{current_user.name} added a new comment to '{task.title}'."
    if task.user_id != current_user.id:
        create_notification(db, task.user_id, task_id, "COMMENT_ADDED", notif_title, notif_msg)
    if task.assigned_to and task.assigned_to != current_user.id and task.assigned_to != task.user_id:
        create_notification(db, task.assigned_to, task_id, "COMMENT_ADDED", notif_title, notif_msg)
    db.commit()

    return CommentResponse(
        id=comment.id,
        content=comment.content,
        createdAt=comment.createdAt,
        user_id=current_user.id,
        user_name=current_user.name,
    )


@app.get("/tasks/{task_id}/comments", response_model=list[CommentResponse])
def get_comments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    query = _base_task_query(current_user, db)
    task = query.filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comments = (
        db.query(CommentModel)
        .options(joinedload(CommentModel.user))
        .filter(CommentModel.task_id == task_id)
        .order_by(CommentModel.createdAt.asc())
        .all()
    )
    return [
        CommentResponse(
            id=c.id,
            content=c.content,
            createdAt=c.createdAt,
            user_id=c.user_id,
            user_name=c.user.name if c.user else "Unknown",
        )
        for c in comments
    ]


@app.delete("/comments/{comment_id}", status_code=204)
@limiter.limit("100/minute")
def delete_comment(
    request: Request,
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    comment = db.query(CommentModel).filter(CommentModel.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id and current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Cannot delete another user's comment")
    db.delete(comment)
    db.commit()


# ─── Activity Routes ────────────────────────────────────


@app.get("/tasks/{task_id}/activity", response_model=list[ActivityLogResponse])
def get_activity(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    query = _base_task_query(current_user, db)
    task = query.filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    logs = (
        db.query(ActivityLogModel)
        .options(joinedload(ActivityLogModel.user))
        .filter(ActivityLogModel.task_id == task_id)
        .order_by(ActivityLogModel.createdAt.desc())
        .all()
    )
    return [
        ActivityLogResponse(
            id=log.id,
            action=log.action,
            details=log.details,
            createdAt=log.createdAt,
            user_id=log.user_id,
            user_name=log.user.name if log.user else "Unknown",
        )
        for log in logs
    ]


# ─── Notification Routes ────────────────────────────────


@app.get("/notifications/unread-count")
@limiter.limit("100/minute")
def get_unread_count(
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    count = db.query(NotificationModel).filter(
        NotificationModel.recipient_id == current_user.id,
        NotificationModel.is_read == "false",
    ).count()
    return {"count": count}


@app.get("/notifications", response_model=PaginatedNotificationsResponse)
@limiter.limit("100/minute")
def get_notifications(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    query = db.query(NotificationModel).filter(NotificationModel.recipient_id == current_user.id)
    total = query.count()
    pages = max(1, (total + limit - 1) // limit)
    items = (
        query.order_by(NotificationModel.createdAt.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return PaginatedNotificationsResponse(
        items=[
            NotificationResponse(
                id=n.id,
                recipient_id=n.recipient_id,
                task_id=n.task_id,
                type=n.type,
                title=n.title,
                message=n.message,
                is_read=n.is_read == "true",
                createdAt=n.createdAt,
            )
            for n in items
        ],
        total=total,
        page=page,
        pages=pages,
    )


@app.patch("/notifications/{notification_id}/read", status_code=200)
@limiter.limit("100/minute")
def mark_notification_read(
    request: Request,
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    notif = db.query(NotificationModel).filter(NotificationModel.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot modify another user's notification")
    notif.is_read = "true"
    db.commit()
    return {"detail": "Notification marked as read"}


@app.patch("/notifications/read-all", status_code=200)
@limiter.limit("100/minute")
def mark_all_notifications_read(
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    db.query(NotificationModel).filter(
        NotificationModel.recipient_id == current_user.id,
        NotificationModel.is_read == "false",
    ).update({"is_read": "true"})
    db.commit()
    return {"detail": "All notifications marked as read"}


@app.delete("/notifications/{notification_id}", status_code=204)
@limiter.limit("100/minute")
def delete_notification(
    request: Request,
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    notif = db.query(NotificationModel).filter(NotificationModel.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's notification")
    db.delete(notif)
    db.commit()
    return
