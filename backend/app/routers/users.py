from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud import crud_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.routers.deps import get_current_user, get_current_admin

router = APIRouter()

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Requires auth to see users list
):
    users = crud_user.get_users(db, skip=skip, limit=limit)
    return users

@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_update: UserUpdate,  # will read the role field
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)  # Admin only
):
    if role_update.role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'admin' or 'user'"
        )
    db_user = crud_user.get_user_by_id(db, user_id=user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # Don't allow changing one's own role (safety measure)
    if db_user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update your own role"
        )
    return crud_user.update_user_role(db, user_id=user_id, role=role_update.role)
