#!/usr/bin/env python3
"""Seed a local Keycloak instance with everything CSAT expects.

Idempotent — re-running is safe; existing resources are left alone. Uses only
the Python standard library so it can run on any host without `pip install`.

Usage:
    docker compose --profile sso up -d        # start Keycloak first
    scripts/seed-keycloak.py                  # then this

Environment overrides (all optional):
    KC_URL                    default http://localhost:8081
    KEYCLOAK_ADMIN            default admin
    KEYCLOAK_ADMIN_PASSWORD   default admin
    REALM                     default csat
    CLIENT_ID                 default csat-app
    CSAT_BASE_URL             default http://localhost
    TEST_PASSWORD             default Test123!

Test users created (idempotent):
    alice / Test123!  → csat-admins
    bob   / Test123!  → csat-analysts
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

KC_URL = os.environ.get("KC_URL", "http://localhost:8081").rstrip("/")
KC_ADMIN = os.environ.get("KEYCLOAK_ADMIN", "admin")
KC_ADMIN_PASSWORD = os.environ.get("KEYCLOAK_ADMIN_PASSWORD", "admin")
REALM = os.environ.get("REALM", "csat")
CLIENT_ID = os.environ.get("CLIENT_ID", "csat-app")
CSAT_BASE_URL = os.environ.get("CSAT_BASE_URL", "http://localhost").rstrip("/")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "Test123!")

GROUPS = ["csat-admins", "csat-analysts", "csat-auditors", "csat-viewers"]
USERS = [
    {"username": "alice", "email": "alice@csat.local", "first": "Alice",
     "last": "Admin", "group": "csat-admins"},
    {"username": "bob", "email": "bob@csat.local", "first": "Bob",
     "last": "Analyst", "group": "csat-analysts"},
]


def _request(method: str, url: str, *, token: str | None = None,
             body: Any = None, form: dict | None = None,
             expect_json: bool = True) -> tuple[int, Any, dict]:
    headers: dict[str, str] = {}
    data: bytes | None = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    elif form is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = urllib.parse.urlencode(form).encode()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read()
            payload = json.loads(raw) if raw and expect_json else raw
            return resp.status, payload, dict(resp.headers)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", errors="replace")}
        return e.code, payload, dict(e.headers or {})


def wait_for_keycloak(timeout_s: int = 120) -> None:
    deadline = time.time() + timeout_s
    discovery = f"{KC_URL}/realms/master/.well-known/openid-configuration"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(discovery, timeout=3) as r:
                if r.status == 200:
                    return
        except Exception:
            pass
        time.sleep(2)
    raise SystemExit(f"✗ Keycloak not reachable at {KC_URL} after {timeout_s}s")


def get_admin_token() -> str:
    status, body, _ = _request(
        "POST",
        f"{KC_URL}/realms/master/protocol/openid-connect/token",
        form={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": KC_ADMIN,
            "password": KC_ADMIN_PASSWORD,
        },
    )
    if status != 200:
        raise SystemExit(f"✗ Could not authenticate as admin: HTTP {status} {body}")
    return body["access_token"]


def ensure_realm(token: str) -> None:
    status, _, _ = _request("GET", f"{KC_URL}/admin/realms/{REALM}", token=token)
    if status == 200:
        print(f"→ Realm '{REALM}' already exists")
        return
    status, _, _ = _request(
        "POST", f"{KC_URL}/admin/realms",
        token=token, body={"realm": REALM, "enabled": True},
        expect_json=False,
    )
    if status not in (201, 204):
        raise SystemExit(f"✗ Could not create realm: HTTP {status}")
    print(f"✓ Realm '{REALM}' created")


def find_client(token: str) -> str | None:
    status, body, _ = _request(
        "GET", f"{KC_URL}/admin/realms/{REALM}/clients?clientId={CLIENT_ID}",
        token=token,
    )
    if status == 200 and isinstance(body, list) and body:
        return body[0]["id"]
    return None


def ensure_client(token: str) -> str:
    existing = find_client(token)
    if existing:
        print(f"→ Client '{CLIENT_ID}' already exists")
        return existing
    spec = {
        "clientId": CLIENT_ID,
        "enabled": True,
        "publicClient": False,
        "standardFlowEnabled": True,
        "directAccessGrantsEnabled": False,
        "rootUrl": CSAT_BASE_URL,
        "redirectUris": [f"{CSAT_BASE_URL}/api/auth/oidc/callback"],
        "webOrigins": [CSAT_BASE_URL],
        "attributes": {"pkce.code.challenge.method": "S256"},
    }
    status, body, headers = _request(
        "POST", f"{KC_URL}/admin/realms/{REALM}/clients",
        token=token, body=spec, expect_json=False,
    )
    if status not in (201, 204):
        raise SystemExit(f"✗ Could not create client: HTTP {status} {body}")
    uuid = find_client(token)
    if not uuid:
        raise SystemExit("✗ Client created but cannot locate it afterwards")
    print(f"✓ Client '{CLIENT_ID}' created")
    return uuid


def ensure_groups_mapper(token: str, client_uuid: str) -> None:
    status, body, _ = _request(
        "GET",
        f"{KC_URL}/admin/realms/{REALM}/clients/{client_uuid}/protocol-mappers/models",
        token=token,
    )
    mappers = body if isinstance(body, list) else []
    if any(m.get("name") == "groups-claim" for m in mappers):
        print("→ Groups protocol mapper already present")
        return
    spec = {
        "name": "groups-claim",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-group-membership-mapper",
        "config": {
            "full.path": "false",
            "id.token.claim": "true",
            "access.token.claim": "true",
            "userinfo.token.claim": "true",
            "claim.name": "groups",
        },
    }
    status, body, _ = _request(
        "POST",
        f"{KC_URL}/admin/realms/{REALM}/clients/{client_uuid}/protocol-mappers/models",
        token=token, body=spec, expect_json=False,
    )
    if status not in (201, 204):
        raise SystemExit(f"✗ Could not add groups mapper: HTTP {status} {body}")
    print("✓ Groups protocol mapper added")


def find_group_id(token: str, name: str) -> str | None:
    status, body, _ = _request(
        "GET", f"{KC_URL}/admin/realms/{REALM}/groups?search={urllib.parse.quote(name)}",
        token=token,
    )
    if status == 200 and isinstance(body, list):
        for g in body:
            if g.get("name") == name:
                return g["id"]
    return None


def ensure_group(token: str, name: str) -> str:
    existing = find_group_id(token, name)
    if existing:
        return existing
    status, body, _ = _request(
        "POST", f"{KC_URL}/admin/realms/{REALM}/groups",
        token=token, body={"name": name}, expect_json=False,
    )
    if status not in (201, 204):
        raise SystemExit(f"✗ Could not create group {name}: HTTP {status} {body}")
    gid = find_group_id(token, name)
    if not gid:
        raise SystemExit(f"✗ Group {name} created but cannot locate")
    print(f"✓ Group '{name}' created")
    return gid


def find_user(token: str, username: str) -> str | None:
    status, body, _ = _request(
        "GET", f"{KC_URL}/admin/realms/{REALM}/users?username={urllib.parse.quote(username)}",
        token=token,
    )
    if status == 200 and isinstance(body, list):
        for u in body:
            if u.get("username") == username:
                return u["id"]
    return None


def ensure_user(token: str, spec: dict) -> str:
    existing = find_user(token, spec["username"])
    if existing:
        print(f"→ User '{spec['username']}' already exists")
        return existing
    payload = {
        "username": spec["username"],
        "email": spec["email"],
        "firstName": spec["first"],
        "lastName": spec["last"],
        "enabled": True,
        "emailVerified": True,
        "credentials": [{"type": "password", "value": TEST_PASSWORD, "temporary": False}],
    }
    status, body, _ = _request(
        "POST", f"{KC_URL}/admin/realms/{REALM}/users",
        token=token, body=payload, expect_json=False,
    )
    if status not in (201, 204):
        raise SystemExit(f"✗ Could not create user {spec['username']}: HTTP {status} {body}")
    uuid = find_user(token, spec["username"])
    if not uuid:
        raise SystemExit(f"✗ User {spec['username']} created but cannot locate")
    print(f"✓ User '{spec['username']}' created")
    return uuid


def assign_user_to_group(token: str, user_id: str, group_id: str) -> None:
    status, _, _ = _request(
        "PUT",
        f"{KC_URL}/admin/realms/{REALM}/users/{user_id}/groups/{group_id}",
        token=token, expect_json=False,
    )
    if status not in (200, 204):
        raise SystemExit(f"✗ Could not assign group: HTTP {status}")


def get_client_secret(token: str, client_uuid: str) -> str:
    status, body, _ = _request(
        "GET",
        f"{KC_URL}/admin/realms/{REALM}/clients/{client_uuid}/client-secret",
        token=token,
    )
    if status != 200 or not isinstance(body, dict):
        raise SystemExit(f"✗ Could not read client secret: HTTP {status}")
    return body.get("value") or ""


def main() -> None:
    print(f"→ Waiting for Keycloak at {KC_URL}...")
    wait_for_keycloak()

    print("→ Authenticating as admin...")
    token = get_admin_token()

    ensure_realm(token)
    client_uuid = ensure_client(token)
    ensure_groups_mapper(token, client_uuid)

    group_ids = {g: ensure_group(token, g) for g in GROUPS}

    for u in USERS:
        user_id = ensure_user(token, u)
        assign_user_to_group(token, user_id, group_ids[u["group"]])
        print(f"   ↳ {u['username']} added to {u['group']}")

    secret = get_client_secret(token, client_uuid)

    print("\n✓ Keycloak seeded.\n")
    print(f"   Realm:         {REALM}")
    print(f"   Client ID:     {CLIENT_ID}")
    print(f"   Client secret: {secret}\n")
    print("   From your browser:")
    print(f"     Issuer URL:  {KC_URL}/realms/{REALM}\n")
    print("   From inside the CSAT backend container (recommended):")
    print(f"     Issuer URL:  http://csat-keycloak:8080/realms/{REALM}\n")
    print(f"   Test users (password: {TEST_PASSWORD}):")
    for u in USERS:
        print(f"     {u['username']:8s} → {u['group']}")
    print("\n   Configure CSAT → Settings → Integrations → Keycloak with those values.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
