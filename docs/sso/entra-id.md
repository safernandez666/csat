# Microsoft Entra ID (Azure AD) — SSO setup

This walks you through wiring CSAT to Entra ID using OIDC. The free tier is
enough for testing — you can use your personal Microsoft account or create a
fresh tenant at [entra.microsoft.com](https://entra.microsoft.com).

> **TL;DR**: register an app, add a groups claim, paste three values into
> CSAT → Settings → Single Sign-On. End-to-end takes ~10 minutes.

---

## 1. Register the application in Entra ID

1. Sign into **Entra admin center** → **Applications → App registrations → New registration**.
2. Fill in:
   - **Name**: `CSAT` (free text — this only shows in the admin UI).
   - **Supported account types**: pick `Accounts in this organizational directory only` for a single tenant.
   - **Redirect URI**: select `Web` and enter `https://csat.your-org.com/api/auth/oidc/callback`. For local development, `http://localhost/api/auth/oidc/callback` is allowed by Entra without HTTPS.
3. Click **Register**.

After registration, **save these values** from the app's overview blade:

| What | Where in Entra |
|---|---|
| **Application (client) ID** | Overview → "Application (client) ID" |
| **Directory (tenant) ID** | Overview → "Directory (tenant) ID" |

You'll paste them into CSAT shortly.

---

## 2. Generate a client secret

1. In your app registration, go to **Certificates & secrets → Client secrets → New client secret**.
2. Description: `CSAT initial`. Expiry: pick something reasonable (default 6 months).
3. Click **Add**, and **immediately copy the value** (the column titled `Value`, NOT `Secret ID`). Entra hides it on page reload.

---

## 3. Add the groups claim

By default, Entra ID does **not** include group membership in ID tokens. CSAT
maps groups → roles, so we need to opt in.

1. In your app registration, go to **Token configuration → Add groups claim**.
2. Select **Security groups** (covers most cases). Enable for `ID`, `Access` and `SAML` token types.
3. **Important**: under "Customize token properties by type", set the ID token
   format to **Group ID** by default — this emits the group's GUID, not its
   display name.

You have two paths from here:

### Option A — use group GUIDs in CSAT (simplest, no extra steps)

CSAT will receive groups in the token like
`["7fbf7c5e-...", "a8d4e3f2-..."]`. You map those GUIDs to roles in CSAT.
This is the lowest-friction option — no additional configuration in Entra.

To find a group's GUID: **Entra admin center → Groups → All groups →** click the
group you want → its **Object Id** is the GUID you'll use.

### Option B — use group display names (cleaner mapping)

If you want `csat-admins` instead of `7fbf7c5e-...` in your CSAT mapping, you
need to either:

- Use **on-premises sync'd groups** with `sAMAccountName` (only works if Entra
  is connected to AD via Entra Connect), or
- Add an **optional claim**:
  - Go to **Token configuration → Add optional claim → ID** → choose `groups` and
    pick the format you want (the `groups` claim with `cloud_displayname` is the
    most readable).
  - Microsoft's docs are honest: *not all configurations support display names*.
    If your tenant doesn't, fall back to Option A.

---

## 4. Create the groups in Entra (if you don't have them yet)

1. **Entra admin center → Groups → New group**.
2. Group type: **Security**. Name: e.g. `csat-admins`.
3. Add the user accounts that should have admin in CSAT.

Repeat for `csat-analysts`, `csat-auditors`, `csat-viewers` (or whatever names
match your org's convention).

---

## 5. Configure CSAT

In CSAT as admin → **Settings → Single Sign-On**:

| Field | Value |
|---|---|
| **Enable SSO** | ✓ |
| **Issuer URL** | `https://login.microsoftonline.com/<TENANT_ID>/v2.0` |
| **Client ID** | the Application (client) ID from step 1 |
| **Client Secret** | the secret value from step 2 |
| **Group → Role mapping** | If you went with **Option A**: paste each group's GUID into the corresponding row. If **Option B**: paste the group display name. |
| **Default role** | `Viewer` (or `Deny if no group matches` if you want strict gating) |

Click **Test connection** — if you see green, the discovery + JWKS endpoints
are reachable. Click **Save**.

The login screen now shows **Sign in with corporate SSO**.

---

## 6. First sign-in

1. Open `/login` in a private window (so you don't reuse a stale local session).
2. Click **Sign in with corporate SSO**.
3. Authenticate with your Entra ID account.
4. You land back on the CSAT dashboard. Your CSAT user was provisioned
   on-the-fly: email + display name from the token, role from the group mapping.

To verify the role assignment:

```bash
curl -b cookies.txt http://localhost/api/auth/me
```

You should see the CSAT roles that match your Entra groups.

---

## Troubleshooting

**"AADSTS50011: Reply URL specified in the request does not match"**
The `Redirect URI` in step 1 doesn't match what CSAT is sending. CSAT derives
it from `X-Forwarded-Proto/Host`, so make sure those headers are correct
behind your reverse proxy. The exact path is always `/api/auth/oidc/callback`.

**Login succeeds but I get "No matching role for your groups"**
Either:
- The token isn't carrying groups (check **Token configuration**, then jwt.ms
  to inspect the actual claim), or
- The mapping uses display names but Entra is emitting GUIDs (or vice versa).
  Adjust whichever is wrong.

**"Cannot connect to login.microsoftonline.com"**
CSAT couldn't reach Entra. Check egress firewall rules — the backend
container needs outbound HTTPS to `login.microsoftonline.com` and
`graph.microsoft.com`.

**The `groups` claim is missing entirely**
Two common causes:
1. The user is a member of more groups than Entra is willing to embed (overage).
   In that case Entra emits a `_claim_names` reference and CSAT has to call
   Microsoft Graph to resolve. CSAT does **not** currently do that — pin user
   group membership to ≤200 groups, or use Microsoft Graph extension.
2. The app permissions don't include `GroupMember.Read.All`. Add it under
   **API permissions** if needed.

---

## Production hardening

- Restrict the **Redirect URI** to only your production CSAT URL.
- Rotate the client secret regularly. Entra lets you have multiple active
  secrets so you can rotate without downtime.
- Consider enabling **Conditional Access** policies on the CSAT app — MFA,
  device compliance, country restrictions — Entra handles all of that, CSAT
  just trusts the token.
- Keep `default_role` empty in production, so a user without a matching group
  is denied access instead of being silently downgraded to Viewer.
