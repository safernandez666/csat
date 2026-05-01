from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_viewer
from app.services.control_service import get_control_summary
from app.models.control import Control, Safeguard
from app.models.review_schedule import ReviewSchedule
from app.utils.cis_groups import get_cis_group
from app.utils.cis_ig_map import SAFEGUARD_IG
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db), _=Depends(require_viewer)):
    summary = get_control_summary(db)
    upcoming_reviews = db.query(ReviewSchedule).filter(
        ReviewSchedule.next_review_at <= datetime.now(timezone.utc) + timedelta(days=7),
        ReviewSchedule.next_review_at >= datetime.now(timezone.utc),
    ).count()
    recent_activity = db.query(Control).order_by(Control.updated_at.desc()).limit(5).all()
    return {
        "summary": summary,
        "upcoming_reviews": upcoming_reviews,
        "recent_activity": [
            {"id": c.id, "cis_id": c.cis_id, "name": c.name, "status": c.status, "updated_at": c.updated_at.isoformat() if c.updated_at else None}
            for c in recent_activity
        ],
    }


@router.get("/trends")
def dashboard_trends(db: Session = Depends(get_db), _=Depends(require_viewer)):
    summary = get_control_summary(db)
    return {
        "labels": ["Implemented", "In Progress", "Not Implemented", "Needs Review"],
        "data": [
            summary["implemented"],
            summary["in_progress"],
            summary["not_implemented"],
            summary["needs_review"],
        ],
    }


@router.get("/radar")
def dashboard_radar(db: Session = Depends(get_db), _=Depends(require_viewer)):
    controls = db.query(Control).all()
    groups = {"Basic": [], "Foundational": [], "Organizational": []}
    for c in controls:
        g = get_cis_group(c.cis_id)
        if g in groups:
            groups[g].append(c.status == "implemented")
    radar = []
    for g, vals in groups.items():
        score = round((sum(vals) / len(vals)) * 100) if vals else 0
        radar.append({"group": g, "score": score, "total": len(vals)})
    return {"radar": radar}


@router.get("/ig-progress")
def dashboard_ig_progress(db: Session = Depends(get_db), _=Depends(require_viewer)):
    safeguards = db.query(Safeguard).all()
    result = {"ig1": {"total": 0, "implemented": 0}, "ig2": {"total": 0, "implemented": 0}, "ig3": {"total": 0, "implemented": 0}}
    for sg in safeguards:
        key = sg.ig
        if key not in result:
            continue
        result[key]["total"] += 1
        if sg.implementation_status == "implemented":
            result[key]["implemented"] += 1
    for key in result:
        t = result[key]["total"]
        i = result[key]["implemented"]
        result[key]["score"] = round((i / t) * 100) if t else 0
    return result


@router.get("/control-scores")
def dashboard_control_scores(db: Session = Depends(get_db), _=Depends(require_viewer)):
    controls = sorted(db.query(Control).all(), key=lambda c: int(c.cis_id))
    scores = []
    for c in controls:
        total = len(c.safeguards)
        implemented = sum(1 for s in c.safeguards if s.implementation_status == "implemented")
        score = round((implemented / total) * 100) if total else 0
        scores.append({
            "id": c.id,
            "cis_id": c.cis_id,
            "name": c.name,
            "status": c.status,
            "group": get_cis_group(c.cis_id),
            "score": score,
            "total": total,
            "implemented": implemented,
        })
    return {"scores": scores}
