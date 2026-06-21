from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate

def get_task_by_id(db: Session, task_id: int) -> Optional[Task]:
    return db.query(Task).filter(Task.id == task_id).first()

def get_tasks(
    db: Session,
    *,
    owner_id: Optional[int] = None,  # If provided, limits to created_by or assigned_to this user
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[Task], int]:
    query = db.query(Task)
    
    # 1. Ownership scope (non-admin view restriction)
    if owner_id is not None:
        query = query.filter(
            or_(Task.creator_id == owner_id, Task.assignee_id == owner_id)
        )
        
    # 2. Filtering
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)
        
    # 3. Search query (title and description)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Task.title.ilike(search_filter),
                Task.description.ilike(search_filter)
            )
        )
        
    # Get total count before pagination limits
    total_count = query.count()
    
    # 4. Sort and Paginate (show newest tasks first)
    tasks = query.order_by(desc(Task.created_at)).offset(skip).limit(limit).all()
    
    return tasks, total_count

def create_task(db: Session, task_in: TaskCreate, creator_id: int) -> Task:
    db_task = Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status or "todo",
        priority=task_in.priority or "medium",
        due_date=task_in.due_date,
        creator_id=creator_id,
        assignee_id=task_in.assignee_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, db_task: Task, task_in: TaskUpdate) -> Task:
    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, db_task: Task) -> None:
    db.delete(db_task)
    db.commit()
