from datetime import datetime, timedelta, timezone
from typing import Optional, List
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings
from app.models.user import User

ph = PasswordHasher(
    time_cost=settings.argon2_time_cost,
    memory_cost=settings.argon2_memory_cost,
    parallelism=settings.argon2_parallelism,
)

security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        ph.verify(hashed, password)
        return True
    except VerifyMismatchError:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm], options={"verify_signature": True})  # ship-safe-ignore JWT_VERIFY_DISABLED: PyJWT decode() verifies signature by default
        return payload
    except jwt.PyJWTError:
        return None


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> User:
    from app.api.deps import get_db  # deferred to break circular import
    db_gen = get_db(request)
    db = next(db_gen)
    try:
        token = credentials.credentials if credentials else request.cookies.get("access_token")
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        expected_tenant = getattr(getattr(request.state, "tenant", None), "slug", None)
        if settings.is_saas:
            if getattr(request.state, "is_admin_plane", False):
                expected_tenant = "__admin__"
            token_tenant = payload.get("tenant")
            if not token_tenant or token_tenant != expected_tenant:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token does not match tenant")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")
        return user
    finally:
        try:
            next(db_gen, None)
        except StopIteration:
            pass


def require_roles(allowed_roles: List[str]):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        role_names = [r.name for r in current_user.roles]
        if not any(r in allowed_roles for r in role_names):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return checker


require_admin = require_roles(["Admin"])
require_analyst = require_roles(["Admin", "Security Analyst"])
require_auditor = require_roles(["Admin", "Security Analyst", "Auditor"])
require_viewer = require_roles(["Admin", "Security Analyst", "Auditor", "Viewer"])
