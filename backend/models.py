import uuid
from datetime import datetime

from sqlalchemy import Column, String
from database import Base


class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="Pending")
    priority = Column(String, default="Medium")
    dueDate = Column(String, nullable=True)
    createdAt = Column(String, default=lambda: datetime.utcnow().isoformat())
