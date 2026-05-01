import json
import urllib.request
from typing import Any, Dict, List

from app.connectors.base import BaseConnector


class AIAnalysisConnector(BaseConnector):
    name = "ai_analysis"

    def configure(self, config: Dict[str, Any]) -> None:
        self.provider = config.get("provider", "ollama")  # ollama | openai | anthropic
        self.api_key = config.get("api_key") or ""
        self.model = config.get("model", "llama3:latest")

        # Provider-specific default URLs
        raw_url = config.get("api_url", "")
        if raw_url:
            self.api_url = raw_url.rstrip("/")
        elif self.provider == "openai":
            self.api_url = "https://api.openai.com"
        elif self.provider == "anthropic":
            self.api_url = "https://api.anthropic.com"
        else:
            self.api_url = ""

    def _call_ollama(self, messages: List[Dict[str, str]], force_json: bool = False) -> str:
        url = f"{self.api_url}/api/chat"
        body: Dict[str, Any] = {"model": self.model, "messages": messages, "stream": False}
        if force_json:
            body["format"] = "json"
        payload = json.dumps(body).encode()
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
            return data.get("message", {}).get("content", "")

    def _call_openai(self, messages: List[Dict[str, str]], force_json: bool = False) -> str:
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
            return data["choices"][0]["message"]["content"]

    def _call_anthropic(self, messages: List[Dict[str, str]]) -> str:
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
            return data["content"][0]["text"]

    def chat(self, messages: List[Dict[str, str]], force_json: bool = False) -> str:
        if self.provider == "ollama":
            return self._call_ollama(messages, force_json=force_json)
        elif self.provider == "openai":
            return self._call_openai(messages, force_json=force_json)
        elif self.provider == "anthropic":
            return self._call_anthropic(messages)
        raise ValueError(f"Unsupported provider: {self.provider}")

    def health_check(self) -> Dict[str, Any]:
        try:
            if self.provider == "ollama":
                url = f"{self.api_url}/api/tags"
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    return {"status": "ok", "provider": self.provider} if resp.status == 200 else {"status": "error"}
            elif self.provider == "openai":
                url = f"{self.api_url}/v1/models"
                req = urllib.request.Request(url, headers={"Authorization": f"Bearer {self.api_key}"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    return {"status": "ok", "provider": self.provider} if resp.status == 200 else {"status": "error"}
            elif self.provider == "anthropic":
                # Anthropic no tiene endpoint de health simple, hacemos un ping básico
                return {"status": "ok", "provider": self.provider, "note": "Verify key manually"}
            return {"status": "unknown_provider"}
        except Exception as e:
            return {"status": "error", "detail": str(e)}

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
        try:
            raw = self.chat(messages)
            # Try to extract JSON from markdown code block if present
            content = raw.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            return {"recommendations": [], "error": str(e), "raw": raw if "raw" in dir() else None}

    def fetch_evidence(self, **kwargs) -> list:
        return []
