from fastapi import APIRouter, Depends, Request
from fastapi.exceptions import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, require_viewer, require_auditor, get_current_user
from app.models.comment import Comment
from app.models.user import User
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/comments", tags=["comments"])


class CommentCreate(BaseModel):
    control_id: int
    content: str


class CommentOut(BaseModel):
    id: int
    control_id: int
    user_id: int
    user_name: Optional[str]
    content: str
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[CommentOut])
def list_comments(control_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(require_viewer)):
    q = db.query(Comment)
    if control_id:
        q = q.filter(Comment.control_id == control_id)
    items = q.order_by(Comment.created_at.desc()).all()
    result = []
    for c in items:
        user = db.query(User).filter(User.id == c.user_id).first()
        result.append(CommentOut(
            id=c.id,
            control_id=c.control_id,
            user_id=c.user_id,
            user_name=user.full_name if user else None,
            content=c.content,
            created_at=c.created_at.isoformat() if c.created_at else None,
        ))
    return result


@router.post("", response_model=CommentOut)
def create_comment(req: CommentCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = Comment(
        control_id=req.control_id,
        user_id=current_user.id,
        content=req.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    log_action(db, "comment_created", "comment", resource_id=str(comment.id), user_id=current_user.id, ip_address=request.client.host)
    return CommentOut(
        id=comment.id,
        control_id=comment.control_id,
        user_id=comment.user_id,
        user_name=current_user.full_name,
        content=comment.content,
        created_at=comment.created_at.isoformat() if comment.created_at else None,
    )
