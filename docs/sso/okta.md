# Okta — SSO setup

Wire CSAT to Okta using OIDC. The Okta Developer free tier is enough for
testing — sign up at [developer.okta.com](https://developer.okta.com/signup/).

> **TL;DR**: create an OIDC Web app, expose group claims, paste three values
> into CSAT → Settings → Single Sign-On. End-to-end takes ~10 minutes.

---

## 1. Create the OIDC application in Okta

1. Sign into your Okta admin console.
2. **Applications → Applications → Create App Integration**.
3. Sign-in method: **OIDC - OpenID Connect**. Application type: **Web Application**. Click **Next**.
4. Fill in:
   - **App integration name**: `CSAT`.
   - **Grant type**: leave **Authorization Code** checked. Uncheck the others.
   - **Sign-in redirect URIs**: `https://csat.your-org.com/api/auth/oidc/callback` (or `http://localhost/api/auth/oidc/callback` for local dev).
   - **Sign-out redirect URIs**: leave empty for now.
   - **Controlled access**: pick the assignment policy that suits your org. For testing, "Allow everyone in your organization to access" is the fastest.
5. Click **Save**.

After creation, save these from the app's **General** tab:

| What | Where in Okta |
|---|---|
| **Client ID** | General → Client Credentials → Client ID |
| **Client secret** | General → Client Credentials → Client secrets → "Generate" if empty, then click the eye icon to reveal |
| **Okta domain** | top right of any admin page, e.g. `dev-12345.okta.com` |

---

## 2. Add a groups claim to the ID token

Okta does not include groups in tokens by default.

1. **Security → API → Authorization Servers → default** (or the custom server you intend to use).
2. **Claims → Add Claim**:
   - Name: `groups`
   - Include in token type: **ID Token, Always**
   - Value type: **Groups**
   - Filter: **Matches regex** → `.*` to include every group the user belongs to. Tighten this to `^csat-.*` if you want CSAT to only see groups whose names start with `csat-`.
   - Disable description / Group filter type stays default.
3. Click **Create**.

---

## 3. Create groups (if you don't have them yet)

1. **Directory → Groups → Add Group**.
2. Name: `csat-admins`. Description optional.
3. Repeat for `csat-analysts`, `csat-auditors`, `csat-viewers`.
4. Add users to each group as appropriate.

If you used the `^csat-.*` regex in step 2, the group claim will only contain
those four groups — clean and focused.

---

## 4. Assign the application

By default, OIDC apps are visible only to assigned users.

1. In your CSAT app → **Assignments → Assign → Assign to People** (or **Groups**).
2. Pick the users / groups that should be allowed to sign in.

If you skipped this and chose "Allow everyone in your organization" earlier,
this is already done.

---

## 5. Configure CSAT

In CSAT as admin → **Settings → Single Sign-On**:

| Field | Value |
|---|---|
| **Enable SSO** | ✓ |
| **Issuer URL** | `https://<your-okta-domain>/oauth2/default` (or `/oauth2/<custom-server-id>` if you used a custom auth server) |
| **Client ID** | from step 1 |
| **Client Secret** | from step 1 |
| **Group → Role mapping** | one row per CSAT role with the matching Okta group name |
| **Default role** | `Viewer` or empty for strict gating |

Example mapping:

| CSAT role | Okta group name |
|---|---|
| Admin | `csat-admins` |
| Security Analyst | `csat-analysts` |
| Auditor | `csat-auditors` |
| Viewer | `csat-viewers` |

Click **Test connection** — green means the discovery + JWKS endpoints respond.
Click **Save**.

---

## 6. First sign-in

1. Open `/login` in a private window.
2. Click **Sign in with corporate SSO**.
3. Authenticate with an Okta account that belongs to one of the mapped groups.
4. You land on the dashboard with the role from the mapping.

```bash
curl -b cookies.txt http://localhost/api/auth/me
# → { "email": "...", "roles": [{"name": "Admin"}, ...] }
```

---

## Troubleshooting

**"redirect_uri did not match a registered URI"**
The URI CSAT sends doesn't match step 1. Check `X-Forwarded-Proto` and
`X-Forwarded-Host` from your reverse proxy. The path is always
`/api/auth/oidc/callback`.

**Login succeeds but groups claim is empty**
Open the ID token at [jwt.ms](https://jwt.ms) and check whether the `groups`
claim is present. If not:
- The claim wasn't added in step 2, or
- The user isn't in any group matching the regex filter.

**"No matching role for your groups"**
Group names in CSAT's mapping don't match what Okta sent. Double-check
casing — Okta groups are case-sensitive in the claim.

**Token validation fails with "invalid issuer"**
The Issuer URL in CSAT must exactly match the `iss` claim Okta puts in the
token. With the **default** auth server, it's `https://<domain>/oauth2/default`.
Custom servers have their own ID — find it under **Security → API**.

---

## Production hardening

- Use a **custom authorization server** in Okta if you have one — gives finer
  control over claim shapes, lifetime, and trusted origins.
- Rotate the client secret regularly. Okta lets you have multiple active
  secrets for zero-downtime rotation.
- Lock down assignments: do **not** "allow everyone in your organization"
  in production. Assign only the groups that should have CSAT access.
- Consider Okta sign-on policies on the app to require MFA, device trust,
  or IP allowlists — CSAT just trusts the resulting token.
