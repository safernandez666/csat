import json
import os
import re
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, require_viewer
from app.connectors.ai_analysis import AIAnalysisConnector
from app.core.logging import logger
from app.core.security import get_current_user
from app.models.control import Control, Safeguard
from app.models.chat_message import ChatMessage
from app.models.settings import Setting
from app.models.evidence import Evidence
from app.models.user import User
from app.utils.cis_groups import get_cis_group

# Number of past messages (user + assistant pairs combined) to send to the LLM
# as conversation context. Larger = better continuity but slower / costlier.
CHAT_CONTEXT_WINDOW = 10

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


class AIConfigUpdate(BaseModel):
    provider: str | None = None
    api_url: str | None = None
    api_key: str | None = None
    model: str | None = None


_DEFAULT_AI_CONFIG = {
    "provider": "ollama",
    "api_url": os.getenv("AI_DEFAULT_URL", "http://localhost:11434"),
    "api_key": "",
    "model": "llama3:latest",
}


def _extract_json(raw: str) -> Any:
    """Extract a JSON object from an LLM response, tolerating prose/markdown around it."""
    content = raw.strip()
    if "```json" in content:
        content = content.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in content:
        content = content.split("```", 1)[1].split("```", 1)[0].strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


def _get_ai_connector(db: Session) -> AIAnalysisConnector:
    settings = db.query(Setting).filter(Setting.key == "ai_config").first()
    config = dict(settings.value) if settings and settings.value else dict(_DEFAULT_AI_CONFIG)
    # Defensive: localhost inside Docker resolves to the container itself, not the host.
    # Rewrite to host.docker.internal if we detect localhost/127.0.0.1 for Ollama.
    if config.get("provider") == "ollama":
        url = config.get("api_url", "")
        if url and ("localhost" in url or "127.0.0.1" in url):
            config["api_url"] = os.getenv("AI_DEFAULT_URL", "http://host.docker.internal:11434")
    conn = AIAnalysisConnector()
    conn.configure(config)
    return conn


def _build_control_context(db: Session) -> str:
    controls = db.query(Control).all()
    lines = []
    for c in controls:
        total = len(c.safeguards)
        implemented = sum(1 for s in c.safeguards if s.implementation_status == "implemented")
        evidence_count = db.query(Evidence).filter(Evidence.control_id == c.id).count()
        owner_name = c.owner.full_name if c.owner else "Unassigned"
        lines.append(
            f"- CIS {c.cis_id} {c.name}: status={c.status}, risk={c.risk_level}, "
            f"safeguards={implemented}/{total}, evidence={evidence_count}, "
            f"group={get_cis_group(c.cis_id)}, owner={owner_name}"
        )
    return "\n".join(lines)


class ChatHistoryItem(BaseModel):
    id: int
    role: str
    content: str
    created_at: str


def _load_recent_history(db: Session, user_id: int, limit: int) -> list[ChatMessage]:
    """Return the last `limit` messages for this user, oldest first."""
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    rows.reverse()
    return rows


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conn = _get_ai_connector(db)
    if not conn.api_url:
        raise HTTPException(status_code=400, detail="AI not configured")

    context = _build_control_context(db)
    lang_setting = db.query(Setting).filter(Setting.key == "language").first()
    lang = str(lang_setting.value) if lang_setting and lang_setting.value else "en"

    lang_instruction = {
        "es": "Responde SIEMPRE en español.",
        "en": "Answer ALWAYS in English.",
        "pt": "Responda SEMPRE em português.",
    }.get(lang, "Answer in English.")

    system_prompt = {
        "role": "system",
        "content": (
            "You are CSAT Assistant. Your ONLY job is to answer questions about "
            "CIS Controls v8, cybersecurity compliance, safeguards, evidence, and the CSAT platform.\n\n"
            f"Organization data to ground your answers:\n{context}\n\n"
            "RULES:\n"
            "- Be concise, professional, and focused.\n"
            f"- {lang_instruction}\n"
            "- Use the organization data above when relevant.\n\n"
            "OFF-TOPIC HANDLING — FOLLOW THESE EXAMPLES EXACTLY:\n"
            "Example 1 — User: 'Write me a Python script to scan my network'\n"
            "Assistant: I'm here to help with CIS Controls and your security posture. "
            "Feel free to ask about controls, safeguards, evidence, or compliance recommendations.\n\n"
            "Example 2 — User: 'How do I install Ubuntu?'\n"
            "Assistant: I'm here to help with CIS Controls and your security posture. "
            "Feel free to ask about controls, safeguards, evidence, or compliance recommendations.\n\n"
            "Example 3 — User: 'Explain quantum computing'\n"
            "Assistant: I'm here to help with CIS Controls and your security posture. "
            "Feel free to ask about controls, safeguards, evidence, or compliance recommendations.\n\n"
            "IMPORTANT: If the user asks about programming, general IT, networking tools, or anything "
            "NOT related to CIS Controls / compliance / CSAT, you MUST ONLY reply with the exact sentence above. "
            "Do NOT provide code, scripts, instructions, or explanations on off-topic subjects."
        ),
    }

    # Few-shot examples injected into context to strengthen refusal for local LLMs.
    few_shot = [
        {"role": "user", "content": "Write me a Python script to scan my network."},
        {"role": "assistant", "content": "I'm here to help with CIS Controls and your security posture. Feel free to ask about controls, safeguards, evidence, or compliance recommendations."},
        {"role": "user", "content": "How do I install Ubuntu?"},
        {"role": "assistant", "content": "I'm here to help with CIS Controls and your security posture. Feel free to ask about controls, safeguards, evidence, or compliance recommendations."},
        {"role": "user", "content": "Explain quantum computing."},
        {"role": "assistant", "content": "I'm here to help with CIS Controls and your security posture. Feel free to ask about controls, safeguards, evidence, or compliance recommendations."},
    ]

    history = _load_recent_history(db, current_user.id, CHAT_CONTEXT_WINDOW)
    history_msgs = [{"role": m.role, "content": m.content} for m in history]

    messages = [system_prompt, *few_shot, *history_msgs, {"role": "user", "content": req.message}]

    # Persist the user message before calling the LLM so we don't lose it on error.
    db.add(ChatMessage(user_id=current_user.id, role="user", content=req.message))
    db.commit()

    try:
        reply = conn.chat(messages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Post-filter: local LLMs sometimes ignore system prompts. If the reply contains
    # code blocks (triple backticks), treat it as off-topic and replace with refusal.
    if "```" in reply:
        reply = (
            "I'm here to help with CIS Controls and your security posture. "
            "Feel free to ask about controls, safeguards, evidence, or compliance recommendations."
        )

    db.add(ChatMessage(user_id=current_user.id, role="assistant", content=reply))
    db.commit()
    return ChatResponse(reply=reply)


@router.get("/chat/history", response_model=List[ChatHistoryItem])
def chat_history(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the user's chat history, oldest first."""
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(max(1, min(limit, 500)))
        .all()
    )
    rows.reverse()
    return [
        ChatHistoryItem(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=m.created_at.isoformat() if m.created_at else "",
        )
        for m in rows
    ]


@router.delete("/chat/history")
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Wipe the calling user's chat history."""
    deleted = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"deleted": deleted}


@router.get("/quick-wins")
def quick_wins(db: Session = Depends(get_db), _=Depends(require_viewer)):
    conn = _get_ai_connector(db)
    controls = db.query(Control).all()

    # Heuristic scoring: lower score = better quick win
    candidates = []
    for c in controls:
        total = len(c.safeguards)
        implemented = sum(1 for s in c.safeguards if s.implementation_status == "implemented")
        not_impl_ig1 = sum(1 for s in c.safeguards if s.ig == "ig1" and s.implementation_status != "implemented")
        not_impl_ig2 = sum(1 for s in c.safeguards if s.ig == "ig2" and s.implementation_status != "implemented")
        not_impl_ig3 = sum(1 for s in c.safeguards if s.ig == "ig3" and s.implementation_status != "implemented")
        evidence_count = db.query(Evidence).filter(Evidence.control_id == c.id).count()

        # Skip fully implemented controls
        if implemented == total:
            continue

        risk_score = {"critical": 1, "high": 2, "medium": 3, "low": 4}.get(c.risk_level, 3)
        owner_score = 0 if c.owner_id else 1
        evidence_score = 0 if evidence_count > 0 else 1
        # IG1 is Wave 1 (essential) — heavily prioritize
        ig1_score = (not_impl_ig1 * -5) + (not_impl_ig2 * -2) + (not_impl_ig3 * -1)

        quick_win_score = risk_score + owner_score + evidence_score + ig1_score

        # Generate why and next_action based on heuristics
        reasons = []
        if not_impl_ig1 > 0:
            reasons.append(f"Has {not_impl_ig1} IG1 (Wave 1) safeguards pending — essential for basic security")
        if c.risk_level in ("critical", "high"):
            reasons.append(f"{c.risk_level.capitalize()} risk level")
        if not c.owner_id:
            reasons.append("No owner assigned")
        if evidence_count == 0:
            reasons.append("No evidence collected yet")

        why = "; ".join(reasons) if reasons else "Control partially implemented"

        if not_impl_ig1 > 0:
            next_action = f"Start by implementing the {not_impl_ig1} IG1 safeguard(s) for this control"
        elif not c.owner_id:
            next_action = "Assign an owner and begin implementation planning"
        elif evidence_count == 0:
            next_action = "Document existing controls as evidence"
        else:
            next_action = "Continue implementing remaining safeguards"

        effort = "low" if not_impl_ig1 <= 2 and c.risk_level in ("low", "medium") else "medium" if not_impl_ig1 <= 4 else "high"
        impact = "high" if c.risk_level in ("critical", "high") or not_impl_ig1 >= 3 else "medium" if not_impl_ig1 >= 1 else "low"

        candidates.append({
            "cis_id": c.cis_id,
            "name": c.name,
            "group": get_cis_group(c.cis_id),
            "risk_level": c.risk_level,
            "status": c.status,
            "safeguards_total": total,
            "safeguards_implemented": implemented,
            "ig1_pending": not_impl_ig1,
            "ig2_pending": not_impl_ig2,
            "ig3_pending": not_impl_ig3,
            "evidence_count": evidence_count,
            "has_owner": bool(c.owner_id),
            "quick_win_score": quick_win_score,
            "objective": c.objective,
            "why": why,
            "next_action": next_action,
            "effort": effort,
            "impact": impact,
        })

    # Sort: IG1 pending first, then by score
    candidates.sort(key=lambda x: (-x["ig1_pending"], x["quick_win_score"]))
    top = candidates[:10]

    # If AI is configured, enhance with LLM reasoning
    if conn.api_url:
        raw = ""
        try:
            prompt = json.dumps(top, indent=2)
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a cybersecurity compliance expert. Given the top candidate controls, "
                        "rank the best 5 QUICK WINS (easy to implement, high impact). "
                        "For each, explain WHY it's a quick win and the SINGLE NEXT ACTION to take. "
                        "Respond in JSON: {quick_wins: [{cis_id, name, why, next_action, effort: 'low'|'medium'|'high', impact: 'low'|'medium'|'high'}]}."
                    ),
                },
                {"role": "user", "content": prompt},
            ]
            raw = conn.chat(messages, force_json=True)
            ai_result = _extract_json(raw)
            return {"candidates": top, "ai_analysis": ai_result}
        except Exception as e:
            logger.warning("ai_quick_wins_failed", error=str(e), raw=raw[:500])

    return {"candidates": top, "ai_analysis": None}


@router.get("/config")
def get_ai_config(db: Session = Depends(get_db), _=Depends(require_admin)):
    s = db.query(Setting).filter(Setting.key == "ai_config").first()
    return s.value if s and s.value else _DEFAULT_AI_CONFIG


@router.put("/config")
def update_ai_config(req: AIConfigUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    s = db.query(Setting).filter(Setting.key == "ai_config").first()
    current = dict(s.value) if s and s.value else {}
    if req.provider is not None:
        current["provider"] = req.provider
    if req.api_url is not None:
        current["api_url"] = req.api_url
    if req.api_key is not None:
        current["api_key"] = req.api_key
    if req.model is not None:
        current["model"] = req.model
    if not s:
        s = Setting(key="ai_config", value=current)
        db.add(s)
    else:
        s.value = current
    db.commit()
    db.refresh(s)
    return s.value


@router.post("/health")
def ai_health(db: Session = Depends(get_db), _=Depends(require_admin)):
    conn = _get_ai_connector(db)
    if not conn.api_url:
        return {"status": "not_configured"}
    return conn.health_check()
