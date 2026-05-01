from sqlalchemy.orm import Session
from app.models.control import Control


def compute_compliance_score(controls: list[Control]) -> int:
    """Compliance score as the average of each control's safeguard completion.

    Every control contributes equally regardless of how many safeguards it
    has — a control with 14 safeguards doesn't drown out one with 5. A
    control with no safeguards falls back to its own status flag (binary).

    Returns an integer percentage 0-100.
    """
    if not controls:
        return 0
    pcts: list[float] = []
    for c in controls:
        sgs = c.safeguards
        if not sgs:
            pcts.append(100.0 if c.status == "implemented" else 0.0)
            continue
        done = sum(1 for s in sgs if s.implementation_status == "implemented")
        pcts.append((done / len(sgs)) * 100.0)
    return round(sum(pcts) / len(pcts))


def get_control_summary(db: Session):
    controls = db.query(Control).all()
    total = len(controls)
    implemented = sum(1 for c in controls if c.status == "implemented")
    in_progress = sum(1 for c in controls if c.status == "in_progress")
    not_impl = sum(1 for c in controls if c.status == "not_implemented")
    needs_review = sum(1 for c in controls if c.status == "needs_review")
    by_risk = {
        "critical": sum(1 for c in controls if c.risk_level == "critical"),
        "high":     sum(1 for c in controls if c.risk_level == "high"),
        "medium":   sum(1 for c in controls if c.risk_level == "medium"),
        "low":      sum(1 for c in controls if c.risk_level == "low"),
    }
    return {
        "total": total,
        "implemented": implemented,
        "in_progress": in_progress,
        "not_implemented": not_impl,
        "needs_review": needs_review,
        "compliance_score": compute_compliance_score(controls),
        "by_risk": by_risk,
    }
