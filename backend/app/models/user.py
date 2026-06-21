from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user", nullable=False)  # "admin" or "user"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    # One user can create many tasks
    tasks_created = relationship("Task", back_populates="creator", foreign_keys="Task.creator_id", cascade="all, delete-orphan")
    # One user can be assigned to many tasks
    tasks_assigned = relationship("Task", back_populates="assignee", foreign_keys="Task.assignee_id")
