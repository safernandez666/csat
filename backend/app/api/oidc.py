"""OIDC SSO via Authorization Code Flow + PKCE.

Reads the ``oidc_config`` row from the ``settings`` table. Expected shape::

    {
      "enabled": true,
      "issuer_url": "http://keycloak:8080/realms/csat",
      "client_id": "csat-app",
      "client_secret": "...",
      "group_role_map": {
        "csat-admins":    "Admin",
        "csat-analysts":  "Security Analyst",
        "csat-auditors":  "Auditor",
        "csat-viewers":   "Viewer"
      },
      "default_role": "Viewer"
    }

The same JWT cookies used by the local login flow are emitted on success, so
the rest of the app needs no changes downstream of /api/auth/me.
"""
import base64
import hashlib
import secrets
from typing import Any
from urllib.parse import urlencode

import httpx
from authlib.jose import jwt as authlib_jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.models.settings import Setting
from app.models.user import Role, User
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/auth/oidc", tags=["auth"])

# Cache the discovery document per issuer to avoid hitting it on every login.
_DISCOVERY_CACHE: dict[str, dict] = {}


def get_oidc_config(db: Session) -> dict | None:
    """Return a usable oidc_config dict, or None if SSO is disabled / incomplete."""
    s = db.query(Setting).filter(Setting.key == "oidc_config").first()
    if not s or not s.value:
        return None
    cfg = s.value if isinstance(s.value, dict) else {}
    if not cfg.get("enabled"):
        return None
    required = ("issuer_url", "client_id", "client_secret")
    if not all(cfg.get(k) for k in required):
        return None
    return cfg


def _get_discovery(issuer_url: str) -> dict:
    issuer = issuer_url.rstrip("/")
    if issuer in _DISCOVERY_CACHE:
        return _DISCOVERY_CACHE[issuer]
    url = f"{issuer}/.well-known/openid-configuration"
    with httpx.Client(timeout=10) as client:
        resp = client.get(url)
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"OIDC discovery failed at {url}: HTTP {resp.status_code}",
        )
    doc = resp.json()
    _DISCOVERY_CACHE[issuer] = doc
    return doc


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _make_pkce() -> tuple[str, str]:
    verifier = _b64url(secrets.token_bytes(32))
    challenge = _b64url(hashlib.sha256(verifier.encode()).digest())
    return verifier, challenge


def _redirect_uri(request: Request) -> str:
    """Build the absolute callback URL, honoring nginx proxy headers."""
    scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    return f"{scheme}://{host}/api/auth/oidc/callback"


@router.get("/login")
def oidc_login(request: Request, db: Session = Depends(get_db)):
    cfg = get_oidc_config(db)
    if not cfg:
        raise HTTPException(status_code=400, detail="SSO is not configured")
    discovery = _get_discovery(cfg["issuer_url"])
    state = _b64url(secrets.token_bytes(16))
    verifier, challenge = _make_pkce()
    redirect_uri = _redirect_uri(request)

    params = {
        "response_type": "code",
        "client_id": cfg["client_id"],
        "redirect_uri": redirect_uri,
        "scope": "openid profile email",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    auth_url = f"{discovery['authorization_endpoint']}?{urlencode(params)}"

    resp = RedirectResponse(auth_url, status_code=302)
    # Short-lived cookies bridging the login → callback round trip
    resp.set_cookie("oidc_state", state, httponly=True, secure=settings.cookie_secure,
                    samesite="lax", max_age=600)
    resp.set_cookie("oidc_verifier", verifier, httponly=True, secure=settings.cookie_secure,
                    samesite="lax", max_age=600)
    return resp


def _resolve_groups(claims: dict, access_token: str | None, discovery: dict) -> list[str]:
    """Read group claims from the ID token first, fall back to userinfo."""
    groups = claims.get("groups") or claims.get("roles") or []
    if groups or not access_token:
        return list(groups)
    try:
        with httpx.Client(timeout=10) as client:
            ui = client.get(
                discovery["userinfo_endpoint"],
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if ui.status_code == 200:
                info = ui.json()
                return list(info.get("groups") or info.get("roles") or [])
    except Exception:
        pass
    return []


def _set_session_cookies(resp, user_id: int, email: str) -> None:
    access = create_access_token({"sub": str(user_id), "email": email})
    refresh = create_refresh_token({"sub": str(user_id)})
    resp.set_cookie("access_token", access, httponly=True, secure=settings.cookie_secure,
                    samesite="lax", max_age=settings.access_token_expire_minutes * 60)
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=settings.cookie_secure,
                    samesite="lax", max_age=settings.refresh_token_expire_days * 86400)


@router.get("/callback")
def oidc_callback(request: Request, db: Session = Depends(get_db)):
    cfg = get_oidc_config(db)
    if not cfg:
        raise HTTPException(status_code=400, detail="SSO is not configured")

    code = request.query_params.get("code")
    state = request.query_params.get("state")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    state_cookie = request.cookies.get("oidc_state")
    verifier = request.cookies.get("oidc_verifier")
    if not state_cookie or state_cookie != state or not verifier:
        raise HTTPException(status_code=400, detail="State mismatch")

    discovery = _get_discovery(cfg["issuer_url"])
    redirect_uri = _redirect_uri(request)

    # 1) Exchange the auth code for tokens
    with httpx.Client(timeout=15) as client:
        token_resp = client.post(
            discovery["token_endpoint"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": cfg["client_id"],
                "client_secret": cfg["client_secret"],
                "code_verifier": verifier,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Token exchange failed: HTTP {token_resp.status_code} {token_resp.text[:200]}",
        )
    tokens = token_resp.json()
    id_token = tokens.get("id_token")
    access_token = tokens.get("access_token")
    if not id_token:
        raise HTTPException(status_code=502, detail="IdP returned no id_token")

    # 2) Validate the ID token signature against the IdP JWKS
    with httpx.Client(timeout=10) as client:
        jwks_resp = client.get(discovery["jwks_uri"])
    if jwks_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Could not fetch JWKS")
    jwks = jwks_resp.json()
    try:
        claims = authlib_jwt.decode(id_token, jwks)
        claims.validate()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid ID token: {e}")

    sub = claims.get("sub")
    email = claims.get("email")
    name = claims.get("name") or claims.get("preferred_username") or email
    groups_raw = _resolve_groups(claims, access_token, discovery)
    if not email:
        # Some providers don't include email in the ID token; fetch userinfo
        with httpx.Client(timeout=10) as client:
            ui = client.get(
                discovery["userinfo_endpoint"],
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if ui.status_code == 200:
                info = ui.json()
                email = info.get("email")
                name = name or info.get("name") or info.get("preferred_username")

    if not sub or not email:
        raise HTTPException(status_code=400, detail="ID token missing sub/email")

    # 3) Map IdP groups → CSAT roles
    group_role_map: dict[str, str] = cfg.get("group_role_map") or {}
    default_role: str | None = cfg.get("default_role") or None
    role_names: set[str] = set()
    for g in groups_raw:
        # Keycloak emits "/csat-admins"; OpenID nested groups can include the path.
        clean = str(g).lstrip("/")
        if clean in group_role_map:
            role_names.add(group_role_map[clean])
    if not role_names and default_role:
        role_names.add(default_role)
    if not role_names:
        raise HTTPException(
            status_code=403,
            detail="Your IdP groups don't map to any CSAT role. Ask your admin to update the group mapping.",
        )

    # 4) JIT provisioning — match by external_id first, fall back to email
    user = db.query(User).filter(User.external_id == sub).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, full_name=name or email, external_id=sub,
                    hashed_password=None, is_active=True)
        db.add(user)
        db.flush()
    else:
        if not user.external_id:
            user.external_id = sub
        if name and user.full_name != name:
            user.full_name = name
        if email and user.email != email:
            user.email = email

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")

    # 5) Sync roles to whatever the IdP currently says
    roles = db.query(Role).filter(Role.name.in_(role_names)).all()
    user.roles = roles
    db.commit()
    db.refresh(user)

    log_action(
        db, "login_oidc", "user",
        resource_id=str(user.id), user_id=user.id,
        ip_address=request.client.host if request.client else None,
        details={"groups": list(groups_raw), "roles": [r.name for r in roles]},
    )

    # 6) Emit the same JWT cookies the local login path uses, then redirect home
    resp = RedirectResponse("/", status_code=302)
    _set_session_cookies(resp, user.id, user.email)
    resp.delete_cookie("oidc_state")
    resp.delete_cookie("oidc_verifier")
    return resp


# ---------------------------------------------------------------------------
# Admin-only: validate a tentative OIDC config without saving it
# ---------------------------------------------------------------------------

class OIDCTestRequest(BaseModel):
    issuer_url: str
    client_id: str | None = None
    client_secret: str | None = None


@router.post("/test")
def oidc_test(req: OIDCTestRequest, _admin: User = Depends(require_admin)) -> dict:
    """Probe the IdP without persisting anything.

    Hits the discovery endpoint, parses it, and confirms the URLs we care
    about (authorization, token, jwks, userinfo) are present. We deliberately
    avoid actually exchanging anything — that requires a real user — so this
    is a "is the config plausibly correct" check, not a full login simulation.
    """
    issuer = req.issuer_url.strip().rstrip("/")
    if not issuer:
        return {"status": "error", "detail": "Issuer URL is required."}

    discovery_url = f"{issuer}/.well-known/openid-configuration"
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(discovery_url)
    except httpx.ConnectError as e:
        return {
            "status": "error",
            "detail": f"Cannot connect to {issuer}. Check the URL and that the IdP is reachable from CSAT. ({e})",
        }
    except httpx.TimeoutException:
        return {
            "status": "error",
            "detail": f"Timeout reaching {discovery_url}. The IdP is slow or unreachable.",
        }
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "detail": f"Network error: {e}"}

    if resp.status_code == 404:
        return {
            "status": "error",
            "detail": (
                f"{discovery_url} returned 404. Double-check the Issuer URL — "
                "for Keycloak it's `<base>/realms/<realm>`, for Entra ID "
                "`https://login.microsoftonline.com/<tenant>/v2.0`."
            ),
        }
    if resp.status_code != 200:
        return {
            "status": "error",
            "detail": f"Discovery endpoint returned HTTP {resp.status_code}.",
        }

    try:
        doc = resp.json()
    except ValueError:
        return {"status": "error", "detail": "Discovery endpoint did not return valid JSON."}

    required = ["authorization_endpoint", "token_endpoint", "jwks_uri"]
    missing = [k for k in required if not doc.get(k)]
    if missing:
        return {
            "status": "error",
            "detail": f"Discovery doc is missing required fields: {', '.join(missing)}",
        }

    # Try to fetch the JWKS too — that's the next thing we'd hit at login time
    try:
        with httpx.Client(timeout=10) as client:
            jwks_resp = client.get(doc["jwks_uri"])
        if jwks_resp.status_code != 200:
            return {
                "status": "error",
                "detail": f"JWKS endpoint returned HTTP {jwks_resp.status_code}.",
            }
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "detail": f"Could not reach JWKS: {e}"}

    return {
        "status": "ok",
        "detail": "Discovery + JWKS reachable. Config looks plausible.",
        "issuer": doc.get("issuer"),
        "authorization_endpoint": doc.get("authorization_endpoint"),
        "token_endpoint": doc.get("token_endpoint"),
    }
