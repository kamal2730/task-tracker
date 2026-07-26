import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


class TeamModel(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    createdAt = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    members = relationship("UserModel", back_populates="team")


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="User")
    createdAt = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    team_id = Column(String, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)

    team = relationship("TeamModel", back_populates="members")
    tasks = relationship("TaskModel", back_populates="user", foreign_keys="TaskModel.user_id")
    assigned_tasks = relationship("TaskModel", back_populates="assignee", foreign_keys="TaskModel.assigned_to")
    comments = relationship("CommentModel", back_populates="user")
    activity_logs = relationship("ActivityLogModel", back_populates="user")
    notifications = relationship("NotificationModel", back_populates="recipient", foreign_keys="NotificationModel.recipient_id")


class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="Pending")
    priority = Column(String, default="Medium")
    dueDate = Column(String, nullable=True)
    createdAt = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)

    user = relationship("UserModel", back_populates="tasks", foreign_keys=[user_id])
    assignee = relationship("UserModel", back_populates="assigned_tasks", foreign_keys=[assigned_to])
    comments = relationship("CommentModel", back_populates="task", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLogModel", back_populates="task", cascade="all, delete-orphan")
    notifications = relationship("NotificationModel", back_populates="task", cascade="all, delete-orphan")


class CommentModel(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    content = Column(Text, nullable=False)
    createdAt = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    task = relationship("TaskModel", back_populates="comments")
    user = relationship("UserModel", back_populates="comments")


class ActivityLogModel(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    createdAt = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    task = relationship("TaskModel", back_populates="activity_logs")
    user = relationship("UserModel", back_populates="activity_logs")


class NotificationModel(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(String, default="false")
    createdAt = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    recipient = relationship("UserModel", back_populates="notifications", foreign_keys=[recipient_id])
    task = relationship("TaskModel", back_populates="notifications", foreign_keys=[task_id])
