from pydantic import BaseModel, ConfigDict
from typing import Optional


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = "Medium"
    dueDate: Optional[str] = None
    assigned_to: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[str] = None
    assigned_to: Optional[str] = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    dueDate: Optional[str] = None
    createdAt: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    user_id: str
    user_name: str


class PaginatedTasksResponse(BaseModel):
    items: list[TaskResponse]
    total: int
    page: int
    pages: int


class TaskStatsResponse(BaseModel):
    byStatus: dict[str, int]
    byPriority: dict[str, int]
    total: int
    overdue: int


class TeamCreate(BaseModel):
    name: str


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    createdAt: str


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    role: str
    createdAt: str
    team_id: str | None = None


class UserWithStatsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    role: str
    createdAt: str
    team_id: str | None = None
    task_count: int = 0


class UserCreateAdmin(BaseModel):
    name: str
    email: str
    password: str
    role: str = "User"
    team_id: str | None = None


class UserUpdateAdmin(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None
    role: str | None = None
    team_id: str | None = None


class UserUpdateRole(BaseModel):
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    content: str
    createdAt: str
    user_id: str
    user_name: str


class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    action: str
    details: Optional[str] = None
    createdAt: str
    user_id: str
    user_name: str


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    recipient_id: str
    task_id: Optional[str] = None
    type: str
    title: str
    message: str
    is_read: bool
    createdAt: str


class PaginatedNotificationsResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    page: int
    pages: int
