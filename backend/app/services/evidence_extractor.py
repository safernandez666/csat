"""Extract text from uploaded evidence files for AI evaluation.

MVP scope: PDFs (most common compliance evidence) and plain-text formats.
Other file types return an "unsupported" error so callers can show a
clear message to the user.
"""

from pathlib import Path
from typing import Optional, Tuple

# Cap per-file extracted text to keep prompt under token budget.
# ~30K chars ≈ 7–8K tokens, fits comfortably in 8K-context models.
MAX_CHARS_PER_FILE = 30_000

_TEXT_SUFFIXES = {".txt", ".md", ".csv", ".json", ".log", ".yaml", ".yml"}


def extract_text(file_path: str, mime_type: Optional[str] = None) -> Tuple[str, Optional[str]]:
    """Return (text, error). On success error is None.

    The text is truncated to MAX_CHARS_PER_FILE; a "[truncated]" marker
    is appended when truncation happens.
    """
    if not file_path:
        return "", "No file path"

    path = Path(file_path)
    if not path.is_file():
        return "", f"File not found"

    suffix = path.suffix.lower()
    mt = (mime_type or "").lower()

    try:
        if suffix == ".pdf" or mt == "application/pdf":
            text = _extract_pdf(path)
        elif suffix in _TEXT_SUFFIXES or mt.startswith("text/") or mt in {"application/json"}:
            text = path.read_text(encoding="utf-8", errors="replace")
        else:
            return "", f"Unsupported file type: {suffix or mt or 'unknown'}"
    except Exception as e:
        return "", f"Extraction failed: {e}"

    if len(text) > MAX_CHARS_PER_FILE:
        text = text[:MAX_CHARS_PER_FILE] + "\n[... truncated]"
    return text, None


def _extract_pdf(path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    parts = []
    for i, page in enumerate(reader.pages):
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            parts.append(f"[page {i + 1}: extraction error]")
    return "\n\n".join(parts).strip()
