import os
import uuid
from fastapi import APIRouter, Depends, Request, UploadFile, File, Form
from fastapi.exceptions import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, require_analyst, require_viewer, get_current_user
from app.core.config import settings
from app.models.evidence import Evidence
from app.models.user import User
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/evidence", tags=["evidence"])


class EvidenceOut(BaseModel):
    id: int
    control_id: int
    uploaded_by: int
    uploader_name: Optional[str]
    file_name: Optional[str]
    file_size: Optional[int]
    mime_type: Optional[str]
    note: Optional[str]
    external_link: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[EvidenceOut])
def list_evidence(control_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(require_viewer)):
    q = db.query(Evidence)
    if control_id:
        q = q.filter(Evidence.control_id == control_id)
    items = q.all()
    result = []
    for e in items:
        user = db.query(User).filter(User.id == e.uploaded_by).first()
        result.append(EvidenceOut(
            id=e.id,
            control_id=e.control_id,
            uploaded_by=e.uploaded_by,
            uploader_name=user.full_name if user else None,
            file_name=e.file_name,
            file_size=e.file_size,
            mime_type=e.mime_type,
            note=e.note,
            external_link=e.external_link,
            created_at=e.created_at.isoformat() if e.created_at else None,
        ))
    return result


@router.post("", response_model=EvidenceOut)
def create_evidence(
    request: Request,
    control_id: int = Form(...),
    note: Optional[str] = Form(None),
    external_link: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not any(r.name in ("Admin", "Security Analyst") for r in current_user.roles):
        raise HTTPException(status_code=403, detail="Forbidden")

    file_path = None
    file_name = None
    file_size = None
    mime_type = None

    if file:
        max_size = settings.max_upload_size_mb * 1024 * 1024
        content = file.file.read()
        if len(content) > max_size:
            raise HTTPException(status_code=413, detail="File too large")
        upload_dir = os.path.abspath(settings.upload_dir)
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename or "")[1]
        safe_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(upload_dir, safe_name)
        with open(file_path, "wb") as f:
            f.write(content)
        file_name = file.filename
        file_size = len(content)
        mime_type = file.content_type

    ev = Evidence(
        control_id=control_id,
        uploaded_by=current_user.id,
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        mime_type=mime_type,
        note=note,
        external_link=external_link,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    log_action(db, "evidence_created", "evidence", resource_id=str(ev.id), user_id=current_user.id, ip_address=request.client.host)
    return EvidenceOut(
        id=ev.id,
        control_id=ev.control_id,
        uploaded_by=ev.uploaded_by,
        uploader_name=current_user.full_name,
        file_name=ev.file_name,
        file_size=ev.file_size,
        mime_type=ev.mime_type,
        note=ev.note,
        external_link=ev.external_link,
        created_at=ev.created_at.isoformat() if ev.created_at else None,
    )


@router.delete("/{evidence_id}")
def delete_evidence(evidence_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not any(r.name in ("Admin", "Security Analyst") for r in current_user.roles):
        raise HTTPException(status_code=403, detail="Forbidden")
    ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Not found")
    if ev.file_path and os.path.exists(ev.file_path):
        os.remove(ev.file_path)
    db.delete(ev)
    db.commit()
    log_action(db, "evidence_deleted", "evidence", resource_id=str(evidence_id), user_id=current_user.id, ip_address=request.client.host)
    return {"detail": "Deleted"}
