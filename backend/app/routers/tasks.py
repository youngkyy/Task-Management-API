from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud import crud_task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, PaginatedTasks
from app.routers.deps import get_current_user

router = APIRouter()

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_task.create_task(db, task_in=task_in, creator_id=current_user.id)

@router.get("/", response_model=PaginatedTasks)
def read_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Role management validation:
    # Admin can view all tasks; standard user is limited to their own (created or assigned)
    owner_id = None if current_user.role == "admin" else current_user.id
    
    tasks, total = crud_task.get_tasks(
        db,
        owner_id=owner_id,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        skip=skip,
        limit=limit
    )
    
    return {
        "total": total,
        "tasks": tasks,
        "skip": skip,
        "limit": limit
    }

@router.get("/{task_id}", response_model=TaskResponse)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = crud_task.get_task_by_id(db, task_id=task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    # Role check: only allow view if Admin OR User is creator/assignee
    if current_user.role != "admin" and task.creator_id != current_user.id and task.assignee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this task"
        )
    return task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = crud_task.get_task_by_id(db, task_id=task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    # Role check: only allow update if Admin OR User is creator/assignee
    if current_user.role != "admin" and task.creator_id != current_user.id and task.assignee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this task"
        )
    return crud_task.update_task(db, db_task=task, task_in=task_in)

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = crud_task.get_task_by_id(db, task_id=task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    # Role check: only allow delete if Admin OR User is the creator
    if current_user.role != "admin" and task.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this task. Only the creator or an admin can delete it."
        )
    crud_task.delete_task(db, db_task=task)
    return None
