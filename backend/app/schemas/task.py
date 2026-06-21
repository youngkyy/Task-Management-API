from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

# Minimized user info for nested serialization
class UserMin(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# Shared properties
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None

# Properties to receive on task creation
class TaskCreate(TaskBase):
    pass

# Properties to receive on task update
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None

# Properties to return in API response
class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    creator_id: int
    assignee_id: Optional[int] = None
    
    creator: UserMin
    assignee: Optional[UserMin] = None

    model_config = ConfigDict(from_attributes=True)

# Schema for paginated task responses
class PaginatedTasks(BaseModel):
    total: int
    tasks: List[TaskResponse]
    skip: int
    limit: int
