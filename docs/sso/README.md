# SSO setup guides

CSAT supports OIDC SSO with any compliant provider. Per-provider walkthroughs:

- [Microsoft Entra ID (Azure AD)](./entra-id.md)
- [Okta](./okta.md)
- **Keycloak** — see the [Single Sign-On section in the main README](../../README.md#single-sign-on-keycloak-ad-via-federation). The `docker-compose.yml` ships a Keycloak service under the `sso` profile and `scripts/seed-keycloak.py` bootstraps a working realm in seconds.
- **Active Directory (on-prem)** — federate it via Keycloak's User Federation feature. CSAT itself doesn't speak LDAP; everything funnels through OIDC.

All providers share the same configuration shape on the CSAT side:

| Field | What it is |
|---|---|
| **Issuer URL** | The IdP's OIDC base URL — `https://<idp>/.well-known/openid-configuration` must resolve. |
| **Client ID** | Identifier for the CSAT app, registered in your IdP. |
| **Client Secret** | Confidential secret. Treat it like a password. |
| **Group → Role mapping** | What IdP group grants each CSAT role (Admin / Security Analyst / Auditor / Viewer). |
| **Default role** | Granted when no group matches. Leave empty to deny those users. |

## Picking a provider

| If your org runs… | Use |
|---|---|
| Microsoft 365 / Azure AD | **Entra ID** — already there, no new infra. |
| Okta as the corp IdP | **Okta** — same. |
| Active Directory on-prem, no cloud IdP | **Keycloak** federating LDAP/AD — adds a small piece of infra you control. |
| Nothing yet, just want to test SSO | **Keycloak local** — `docker compose --profile sso up` and you have a working IdP in 30 seconds. |

## Common gotchas across providers

- **Redirect URI mismatch**: every IdP requires you to register the exact callback URL ahead of time. CSAT's is always `<your-csat-base>/api/auth/oidc/callback`.
- **Groups claim missing**: most IdPs don't emit groups by default. Each guide covers the provider-specific setting.
- **HTTPS in production**: Entra ID / Okta accept `http://localhost` for dev only. Production needs HTTPS.
- **Group naming**: keep the IdP group name in `Group → Role mapping` exactly matching what the IdP emits — case-sensitive, and Entra ID often emits GUIDs instead of names.
