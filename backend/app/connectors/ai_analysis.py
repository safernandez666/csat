import json
import socket
import urllib.error
import urllib.request
from typing import Any, Dict, List

from app.connectors.base import BaseConnector


class AIProviderError(Exception):
    """Raised when an upstream AI provider returns an error we can describe."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


_HTTP_HINTS = {
    400: "Bad request — check the model name and parameters.",
    401: "Authentication failed — check the API key in Settings → AI.",
    403: "Forbidden — your API key doesn't have access to this model or endpoint.",
    404: "Not found — the API URL or model name is wrong.",
    422: "The request was rejected — usually a model name or parameter mismatch.",
    429: "Rate limit exceeded — try again in a moment, or check your plan limits.",
    500: "The provider reported an internal error. Try again shortly.",
    502: "Upstream gateway error from the provider.",
    503: "The provider is unavailable. Try again in a few minutes.",
    529: "The provider is overloaded (Anthropic). Try again shortly.",
}


def _provider_label(provider: str) -> str:
    return {
        "ollama": "Ollama",
        "openai": "OpenAI",
        "anthropic": "Anthropic",
        "openrouter": "OpenRouter",
    }.get(provider, provider.title())


class AIAnalysisConnector(BaseConnector):
    name = "ai_analysis"

    def configure(self, config: Dict[str, Any]) -> None:
        self.provider = config.get("provider", "ollama")  # ollama | openai | anthropic | openrouter
        self.api_key = config.get("api_key") or ""
        self.model = config.get("model", "llama3:latest")

        raw_url = config.get("api_url", "")
        if raw_url:
            self.api_url = raw_url.rstrip("/")
        elif self.provider == "openai":
            self.api_url = "https://api.openai.com"
        elif self.provider == "anthropic":
            self.api_url = "https://api.anthropic.com"
        elif self.provider == "openrouter":
            self.api_url = "https://openrouter.ai/api"
        else:
            self.api_url = ""

    def _friendly_error(self, exc: Exception, body: str = "") -> "AIProviderError":
        """Convert a urllib / network exception into an AIProviderError with an
        actionable message. ``body`` is the response body for HTTPError."""
        provider = _provider_label(self.provider)

        # HTTP error from the provider
        if isinstance(exc, urllib.error.HTTPError):
            if exc.code == 401 and self.provider != "ollama":
                return AIProviderError(
                    f"{provider}: invalid or missing API key. Check Settings → AI.",
                    status=exc.code,
                )
            if exc.code == 404 and self.provider == "ollama" and "not found" in body.lower():
                return AIProviderError(
                    f"Model '{self.model}' is not installed in Ollama at {self.api_url}. "
                    f"Run `ollama pull {self.model}`.",
                    status=exc.code,
                )
            if exc.code == 404 and self.provider in ("openai", "openrouter", "anthropic"):
                return AIProviderError(
                    f"{provider}: model '{self.model}' not found, or wrong API URL ({self.api_url}).",
                    status=exc.code,
                )
            hint = _HTTP_HINTS.get(exc.code) or f"{provider} returned HTTP {exc.code}."
            extra = body.strip()[:200]
            if extra:
                hint = f"{hint} Details: {extra}"
            return AIProviderError(hint, status=exc.code)

        # Unwrap URLError to inspect the underlying cause
        underlying = exc
        msg_lower = ""
        if isinstance(exc, urllib.error.URLError):
            underlying = exc.reason if isinstance(exc.reason, Exception) else exc
            msg_lower = str(exc.reason).lower()
        else:
            msg_lower = str(exc).lower()

        # DNS resolution
        if isinstance(underlying, socket.gaierror) or "name or service not known" in msg_lower or "nodename nor servname" in msg_lower:
            extra = ""
            if self.provider == "ollama":
                extra = " From inside Docker, use http://host.docker.internal:11434 to reach Ollama on the host."
            return AIProviderError(
                f"Cannot resolve the hostname in {self.api_url}. "
                f"Check the API URL — the host doesn't exist or DNS is unreachable.{extra}"
            )

        # Connection refused
        if isinstance(underlying, ConnectionRefusedError) or "connection refused" in msg_lower:
            extra = " Make sure Ollama is running (`ollama serve`)." if self.provider == "ollama" else ""
            return AIProviderError(
                f"Connection refused at {self.api_url}. The service isn't accepting connections — "
                f"check the URL and that the service is running on that port.{extra}"
            )

        # Timeout
        if isinstance(underlying, socket.timeout) or "timed out" in msg_lower or "timeout" in msg_lower:
            return AIProviderError(
                f"{provider} timed out at {self.api_url}. The provider is slow or unreachable; "
                "try again or pick a faster model."
            )

        # TLS / certificate
        if "ssl" in msg_lower or "certificate" in msg_lower:
            return AIProviderError(
                f"TLS/SSL error reaching {self.api_url}: {msg_lower}. Check the URL scheme (http vs https)."
            )

        # Catch-all
        reason = msg_lower or str(exc) or type(exc).__name__
        return AIProviderError(f"Network error reaching {provider} at {self.api_url}: {reason}")

    def _safe_urlopen(self, req: urllib.request.Request, timeout: int) -> bytes:
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            raise self._friendly_error(e, body) from e
        except (urllib.error.URLError, socket.gaierror, socket.timeout, ConnectionRefusedError, OSError) as e:
            raise self._friendly_error(e) from e

    def _call_ollama(self, messages: List[Dict[str, str]], force_json: bool = False) -> str:
        url = f"{self.api_url}/api/chat"
        body: Dict[str, Any] = {"model": self.model, "messages": messages, "stream": False}
        if force_json:
            body["format"] = "json"
        payload = json.dumps(body).encode()
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        raw = self._safe_urlopen(req, timeout=300)
        data = json.loads(raw.decode())
        return data.get("message", {}).get("content", "")

    def _call_openai(self, messages: List[Dict[str, str]], force_json: bool = False) -> str:
        if not self.api_key:
            raise AIProviderError(
                f"{_provider_label(self.provider)}: API key required. Set it in Settings → AI.",
                status=401,
            )
        url = f"{self.api_url}/v1/chat/completions"
        body: Dict[str, Any] = {"model": self.model, "messages": messages}
        if force_json:
            body["response_format"] = {"type": "json_object"}
        payload = json.dumps(body).encode()
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"},
        )
        raw = self._safe_urlopen(req, timeout=300)
        data = json.loads(raw.decode())
        return data["choices"][0]["message"]["content"]

    def _call_anthropic(self, messages: List[Dict[str, str]]) -> str:
        if not self.api_key:
            raise AIProviderError(
                "Anthropic: API key required. Set it in Settings → AI.",
                status=401,
            )
        url = f"{self.api_url}/v1/messages"
        payload = json.dumps({"model": self.model, "max_tokens": 4096, "messages": messages}).encode()
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
            },
        )
        raw = self._safe_urlopen(req, timeout=300)
        data = json.loads(raw.decode())
        return data["content"][0]["text"]

    def chat(self, messages: List[Dict[str, str]], force_json: bool = False) -> str:
        if self.provider == "ollama":
            return self._call_ollama(messages, force_json=force_json)
        elif self.provider in ("openai", "openrouter"):
            # OpenRouter is OpenAI-compatible (POST /v1/chat/completions, Bearer auth)
            return self._call_openai(messages, force_json=force_json)
        elif self.provider == "anthropic":
            return self._call_anthropic(messages)
        raise ValueError(f"Unsupported provider: {self.provider}")

    def health_check(self) -> Dict[str, Any]:
        try:
            if self.provider == "ollama":
                url = f"{self.api_url}/api/tags"
                self._safe_urlopen(urllib.request.Request(url), timeout=10)
                return {"status": "ok", "provider": self.provider}
            elif self.provider in ("openai", "openrouter"):
                if not self.api_key:
                    return {"status": "error", "detail": f"{_provider_label(self.provider)}: API key required."}
                url = f"{self.api_url}/v1/models"
                req = urllib.request.Request(url, headers={"Authorization": f"Bearer {self.api_key}"})
                self._safe_urlopen(req, timeout=10)
                return {"status": "ok", "provider": self.provider}
            elif self.provider == "anthropic":
                if not self.api_key:
                    return {"status": "error", "detail": "Anthropic: API key required."}
                # Anthropic doesn't expose a simple health endpoint; treat
                # "key present" as an OK signal and let chat verify.
                return {"status": "ok", "provider": self.provider, "note": "Verify with a chat request"}
            return {"status": "error", "detail": f"Unknown provider: {self.provider}"}
        except AIProviderError as e:
            return {"status": "error", "detail": str(e)}
        except Exception as e:
            return {"status": "error", "detail": f"Unexpected error ({type(e).__name__}): {e}"}

    def analyze_control_gaps(self, control_data: Dict[str, Any]) -> Dict[str, Any]:
        system_prompt = (
            "You are a cybersecurity compliance expert. Analyze the provided CIS control data "
            "and suggest the top 3 'quick wins' — actions that are easy to implement but have high impact. "
            "Respond in JSON with keys: quick_wins (list of objects with control_name, safeguard_id, action, impact, effort)."
        )
        user_prompt = json.dumps(control_data, indent=2)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        raw = ""
        try:
            raw = self.chat(messages)
            content = raw.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            return json.loads(content)
        except AIProviderError as e:
            return {"recommendations": [], "error": str(e)}
        except json.JSONDecodeError:
            return {"recommendations": [], "error": "AI returned malformed JSON", "raw": raw[:500] if raw else None}
        except Exception as e:
            return {"recommendations": [], "error": f"{type(e).__name__}: {e}"}

    def fetch_evidence(self, **kwargs) -> list:
        return []
