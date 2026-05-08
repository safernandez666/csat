#!/usr/bin/env python3
"""Import CIS assessment data from an Excel workbook into CSAT.

Usage (from the backend/ directory):
    PYTHONPATH=. python scripts/import_assessment.py /path/to/report.xlsx

The script updates safeguard statuses, assigns owners, and auto-computes
control statuses from the Excel columns:
    - Question No.        → safeguard_id
    - Control Implemented → implementation_status
    - Assigned To         → control owner (user created if missing)
    - Evidence Docs       → evidence placeholder (optional)
"""

import argparse
import os
import re
import sys

# Allow imports from the backend package
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import openpyxl
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.control import Control, Safeguard
from app.models.user import User, Role
from app.api.controls import _auto_control_status, _apply_status_transition

# ---------------------------------------------------------------------------
# State mapping
# ---------------------------------------------------------------------------
STATUS_MAP = {
    "Implemented on All Systems": "implemented_all",
    "Implemented on Most Systems": "implemented_most",
    "Implemented on Some Systems": "implemented_most",
    "Parts of Policy Implemented": "parts_implemented",
    "Not Implemented": "not_implemented",
    "Not Applicable": "not_applicable",
}


def _cis_id_from_control(control_val: str) -> str:
    """Map 'CIS C01' → '1', 'CIS C18' → '18'."""
    m = re.search(r"(\d+)", control_val)
    if not m:
        raise ValueError(f"Cannot parse control ID from: {control_val}")
    return str(int(m.group(1)))


def _normalize_name(name: str) -> str:
    """Return a clean full name or empty string."""
    return name.strip() if name else ""


def _email_from_name(full_name: str) -> str:
    """Derive an internal email from a full name, e.g. 'Adrian Ramos' → 'adrian.ramos@csat.local'."""
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", "", full_name).lower().strip()
    parts = cleaned.split()
    if len(parts) >= 2:
        local = f"{parts[0]}.{parts[-1]}"
    elif parts:
        local = parts[0]
    else:
        local = "unknown"
    return f"{local}@csat.local"


def _get_or_create_user(db: Session, full_name: str) -> User | None:
    """Find an existing user by full_name or create a new one with an Analyst role."""
    if not full_name:
        return None

    user = db.query(User).filter(User.full_name == full_name).first()
    if user:
        return user

    email = _email_from_name(full_name)
    # If the derived email already exists, reuse that user
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user

    # Create new user
    analyst_role = db.query(Role).filter(Role.name == "Security Analyst").first()
    user = User(
        email=email,
        full_name=full_name,
        hashed_password=None,
        is_active=True,
    )
    db.add(user)
    db.flush()
    if analyst_role:
        user.roles.append(analyst_role)
    db.commit()
    db.refresh(user)
    print(f"  Created user: {full_name} ({email})")
    return user


def import_excel(db: Session, filepath: str) -> dict:
    """Read the Excel and update the database. Returns a summary dict."""
    wb = openpyxl.load_workbook(filepath, data_only=True)
    ws = wb["Critical Controls"]

    stats = {
        "rows_read": 0,
        "safeguards_updated": 0,
        "safeguards_not_found": 0,
        "controls_updated": 0,
        "users_created": 0,
    }

    # Cache lookups
    controls_by_cis_id: dict[str, Control] = {}
    users_by_name: dict[str, User | None] = {}

    for row in ws.iter_rows(min_row=2, values_only=True):
        stats["rows_read"] += 1

        control_val = row[0] or ""
        safeguard_id = str(row[1] or "").strip()
        title = row[2] or ""
        description = row[3] or ""
        policy_defined = row[4] or ""
        control_implemented = row[5] or ""
        control_automated = row[6] or ""
        control_reported = row[7] or ""
        completed_by = _normalize_name(row[8] or "")
        validated_by = _normalize_name(row[9] or "")
        assigned_to = _normalize_name(row[10] or "")
        evidence_docs = str(row[11] or "").strip()

        if not safeguard_id:
            continue

        # Resolve control
        cis_id = _cis_id_from_control(control_val)
        control = controls_by_cis_id.get(cis_id)
        if not control:
            control = db.query(Control).filter(Control.cis_id == cis_id).first()
            if control:
                controls_by_cis_id[cis_id] = control

        if not control:
            print(f"  WARNING: Control not found for cis_id={cis_id} (row {stats['rows_read']})")
            stats["safeguards_not_found"] += 1
            continue

        # Resolve safeguard
        sg = (
            db.query(Safeguard)
            .filter(Safeguard.safeguard_id == safeguard_id, Safeguard.control_id == control.id)
            .first()
        )
        if not sg:
            print(f"  WARNING: Safeguard not found: {safeguard_id} (control {cis_id})")
            stats["safeguards_not_found"] += 1
            continue

        # Update safeguard status
        new_status = STATUS_MAP.get(control_implemented)
        if new_status and sg.implementation_status != new_status:
            sg.implementation_status = new_status
            stats["safeguards_updated"] += 1

        # Update safeguard title/description if empty (Excel has richer text)
        if title and not sg.title:
            sg.title = title
        if description and not sg.description:
            sg.description = description

        # Handle owner assignment
        if assigned_to:
            user = users_by_name.get(assigned_to)
            if user is None and assigned_to not in users_by_name:
                user = _get_or_create_user(db, assigned_to)
                users_by_name[assigned_to] = user
                if user:
                    stats["users_created"] += 1
            if user and control.owner_id != user.id:
                control.owner_id = user.id
                stats["controls_updated"] += 1

        db.commit()

        # Re-compute control status from its safeguards
        new_control_status = _auto_control_status(control)
        if _apply_status_transition(control, new_control_status):
            db.commit()
            db.refresh(control)

    return stats


def main():
    parser = argparse.ArgumentParser(description="Import CIS assessment Excel into CSAT")
    parser.add_argument("filepath", help="Path to the .xlsx file")
    args = parser.parse_args()

    if not os.path.exists(args.filepath):
        print(f"File not found: {args.filepath}")
        sys.exit(1)

    db = SessionLocal()
    try:
        print(f"Importing {args.filepath} …")
        stats = import_excel(db, args.filepath)
        print("\nDone.")
        print(f"  Rows read:           {stats['rows_read']}")
        print(f"  Safeguards updated:  {stats['safeguards_updated']}")
        print(f"  Safeguards missing:  {stats['safeguards_not_found']}")
        print(f"  Controls with owner: {stats['controls_updated']}")
        print(f"  Users created:       {stats['users_created']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
