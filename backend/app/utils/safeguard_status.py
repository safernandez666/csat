"""Safeguard status scoring and control-status derivation helpers.

The five safeguard statuses map to numeric scores:
    implemented_all      → 1.00
    implemented_most     → 0.75
    parts_implemented    → 0.50
    not_implemented      → 0.00
    not_applicable       → excluded from score (doesn't count for or against)
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.control import Control, Safeguard

SAFEGUARD_STATUSES = [
    "implemented_all",
    "implemented_most",
    "parts_implemented",
    "not_implemented",
    "not_applicable",
]

SAFEGUARD_STATUS_LABELS = {
    "implemented_all": "Implemented on All Systems",
    "implemented_most": "Implemented on Most / Some Systems",
    "parts_implemented": "Parts of Policy Implemented",
    "not_implemented": "Not Implemented",
    "not_applicable": "Not Applicable",
}

# Numeric weight for score calculations
SAFEGUARD_SCORES = {
    "implemented_all": 1.0,
    "implemented_most": 0.75,
    "parts_implemented": 0.5,
    "not_implemented": 0.0,
    "not_applicable": 1.0,  # excluded from denominator
}

# Which statuses count as "making progress" for control status derivation
_PROGRESS_STATUSES = {"implemented_all", "implemented_most", "parts_implemented"}

# Which statuses count as "fully implemented" for control status derivation
_FULLY_IMPLEMENTED_STATUSES = {"implemented_all"}


def is_applicable(sg: "Safeguard") -> bool:
    return sg.implementation_status != "not_applicable"


def safeguard_score(sg: "Safeguard") -> float:
    """Return the numeric score for a single safeguard."""
    return SAFEGUARD_SCORES.get(sg.implementation_status, 0.0)


def compute_control_score(control: "Control") -> float:
    """Average safeguard score for a control, excluding not_applicable safeguards."""
    applicable = [s for s in control.safeguards if is_applicable(s)]
    if not applicable:
        return 0.0
    return sum(safeguard_score(s) for s in applicable) / len(applicable)


def auto_control_status(control: "Control") -> str:
    """Derive control status from its safeguards."""
    applicable = [s for s in control.safeguards if is_applicable(s)]
    if not applicable:
        return control.status or "not_implemented"
    all_impl = all(s.implementation_status in _FULLY_IMPLEMENTED_STATUSES for s in applicable)
    any_progress = any(s.implementation_status in _PROGRESS_STATUSES for s in applicable)
    if all_impl:
        return "implemented"
    if any_progress:
        return "in_progress"
    return "not_implemented"


def count_implemented(safeguards: list["Safeguard"]) -> int:
    """Count safeguards that are fully implemented (implemented_all)."""
    return sum(1 for s in safeguards if s.implementation_status == "implemented_all")


def count_not_implemented(safeguards: list["Safeguard"]) -> int:
    """Count safeguards that are not implemented (excludes not_applicable)."""
    return sum(1 for s in safeguards if s.implementation_status == "not_implemented")


def count_in_progress(safeguards: list["Safeguard"]) -> int:
    """Count safeguards that are partially implemented."""
    return sum(
        1 for s in safeguards
        if s.implementation_status in ("implemented_most", "parts_implemented")
    )


def count_not_applicable(safeguards: list["Safeguard"]) -> int:
    return sum(1 for s in safeguards if s.implementation_status == "not_applicable")
