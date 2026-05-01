from app.connectors.base import BaseConnector
from typing import Any, Dict


class ActiveDirectoryConnector(BaseConnector):
    name = "active_directory"

    def configure(self, config: Dict[str, Any]) -> None:
        self.server_url = config.get("server_url", "")
        self.domain = config.get("domain", "")
        self.bind_dn = config.get("bind_dn", "")
        self.bind_password = config.get("bind_password", "")
        self.base_dn = config.get("base_dn", "")
        self.use_ssl = config.get("use_ssl", True)
        self.port = config.get("port", 636 if self.use_ssl else 389)

    def health_check(self) -> Dict[str, Any]:
        if not self.server_url or not self.bind_dn:
            return {"status": "not_configured", "message": "Active Directory not yet configured"}
        try:
            import ldap3
            server = ldap3.Server(
                self.server_url,
                port=self.port,
                use_ssl=self.use_ssl,
                get_info=ldap3.ALL,
            )
            conn = ldap3.Connection(
                server,
                user=self.bind_dn,
                password=self.bind_password,
                auto_bind=True,
                read_only=True,
            )
            bound = conn.bound
            conn.unbind()
            if bound:
                return {"status": "ok", "message": "Connected to Active Directory"}
            return {"status": "error", "message": "Bind failed"}
        except ImportError:
            return {"status": "error", "message": "ldap3 library not installed"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def fetch_evidence(self, **kwargs) -> list:
        return []
