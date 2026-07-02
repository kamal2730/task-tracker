import uuid
from datetime import datetime

from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    createdAt = Column(String, default=lambda: datetime.utcnow().isoformat())

    tasks = relationship("TaskModel", back_populates="user")


class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="Pending")
    priority = Column(String, default="Medium")
    dueDate = Column(String, nullable=True)
    createdAt = Column(String, default=lambda: datetime.utcnow().isoformat())
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    user = relationship("UserModel", back_populates="tasks")
