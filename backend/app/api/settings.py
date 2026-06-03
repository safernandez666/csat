import io
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, UploadFile, File, HTTPException
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, Any

from app.api.deps import get_db, require_admin
from app.core.config import settings
from app.models.settings import Setting
from app.services.audit_service import log_action

# Server-side resize target. Logos render at small sizes in the UI; anything
# larger is wasted bandwidth and storage. Aspect ratio is preserved.
LOGO_MAX_DIM = 512
LOGO_MAX_RAW_BYTES = 10 * 1024 * 1024  # 10 MB before resize

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingUpdate(BaseModel):
    value: Any = None


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    items = db.query(Setting).all()
    return {s.key: s.value for s in items}


@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    """Subset of settings consumable without authentication (login screen, tab title).

    The raw company_logo_url points at the auth-protected /uploads/ path. We
    rewrite it to the public /api/branding/logo endpoint so an unauthenticated
    <img> on the login page can resolve it.
    """
    items = db.query(Setting).filter(
        Setting.key.in_(["platform_name", "company_logo_url", "oidc_config"])
    ).all()
    result: dict = {s.key: s.value for s in items}
    if result.get("company_logo_url"):
        result["company_logo_url"] = "/api/branding/logo"
    # Surface SSO availability without leaking the client secret. Anyone hitting
    # /login needs to know whether to render the "Sign in with SSO" button.
    oidc = result.pop("oidc_config", None) or {}
    result["oidc_enabled"] = bool(
        oidc.get("enabled") and oidc.get("issuer_url") and oidc.get("client_id") and oidc.get("client_secret")
    )
    # Exposed so the login screen can hide demo credentials in non-dev deployments
    result["is_dev"] = settings.is_dev
    return result


@router.put("/{key}")
def update_setting(key: str, req: SettingUpdate, request: Request, db: Session = Depends(get_db), _=Depends(require_admin)):
    s = db.query(Setting).filter(Setting.key == key).first()
    if not s:
        s = Setting(key=key)
        db.add(s)
    s.value = req.value
    db.commit()
    db.refresh(s)
    log_action(db, "setting_updated", "setting", resource_id=key, ip_address=request.client.host, details={"value": req.value})
    return {key: s.value}


@router.post("/logo")
def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(require_admin)):
    """Upload a company logo. Raster images (PNG/JPEG/WebP) are auto-resized
    server-side to a max dimension of LOGO_MAX_DIM keeping aspect ratio and
    re-saved as optimized PNG (transparency preserved). SVG is stored as-is
    because it scales without quality loss.

    Operator UX: just drop any file under 10 MB. The server normalizes
    dimensions, format, and filename. No manual resize required.
    """
    allowed_types = {"image/png", "image/jpeg", "image/svg+xml", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Subí PNG, JPEG, WebP o SVG. (HEIC/GIF/BMP no aceptados — convertí primero.)",
        )

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".png", ".jpg", ".jpeg", ".svg", ".webp"}:
        raise HTTPException(status_code=400, detail="Extensión inválida")

    raw = file.file.read()
    if len(raw) > LOGO_MAX_RAW_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Archivo demasiado grande ({len(raw) // 1024 // 1024} MB). Máximo {LOGO_MAX_RAW_BYTES // 1024 // 1024} MB antes del resize.",
        )

    os.makedirs(settings.upload_dir, exist_ok=True)

    if ext == ".svg":
        # Vector — store verbatim, no resize.
        out_ext = ".svg"
        out_bytes = raw
    else:
        # Raster — open with Pillow, resize keeping aspect, save as PNG.
        try:
            img = Image.open(io.BytesIO(raw))
            img.load()
        except (UnidentifiedImageError, OSError) as e:
            raise HTTPException(status_code=400, detail=f"No se pudo leer la imagen: {e}")
        # Normalize mode for PNG output (preserve transparency where present).
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")
        # Resize only if the image is bigger than our cap.
        if max(img.size) > LOGO_MAX_DIM:
            img.thumbnail((LOGO_MAX_DIM, LOGO_MAX_DIM), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        out_ext = ".png"
        out_bytes = buf.getvalue()

    filename = f"logo_{uuid.uuid4().hex}{out_ext}"
    upload_path = os.path.join(settings.upload_dir, filename)
    with open(upload_path, "wb") as f:
        f.write(out_bytes)

    logo_url = f"/uploads/{filename}"

    # Delete old logo file if it exists.
    old = db.query(Setting).filter(Setting.key == "company_logo_url").first()
    if old and old.value:
        old_path = os.path.join(settings.upload_dir, os.path.basename(str(old.value)))
        if os.path.exists(old_path):
            os.remove(old_path)
        old.value = logo_url
        old.updated_at = datetime.now(timezone.utc)
    else:
        db.add(Setting(key="company_logo_url", value=logo_url, updated_at=datetime.now(timezone.utc)))

    db.commit()
    return {"logo_url": logo_url, "size_bytes": len(out_bytes)}
