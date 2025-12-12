"""Offline draft caching utilities.

Provides lightweight caching for unsent or in-progress drafts so users can
resume work while offline. Drafts are stored on disk in the application's
data directory using a simple JSON structure keyed by document checksum.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Any

from loguru import logger


@dataclass
class DraftEntry:
    """Represents a cached draft state."""

    document_id: str
    content: str
    updated_at: datetime
    metadata: Dict[str, Any]

    def to_serializable(self) -> Dict[str, Any]:
        data = asdict(self)
        data["updated_at"] = self.updated_at.isoformat()
        return data

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "DraftEntry":
        return DraftEntry(
            document_id=data["document_id"],
            content=data.get("content", ""),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            metadata=data.get("metadata", {}),
        )


class OfflineDraftCache:
    """Simple offline cache for draft content."""

    def __init__(self, data_dir: Path, filename: str = "drafts.json"):
        self.cache_path = data_dir / filename
        self._cache: Dict[str, DraftEntry] = {}
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self._load_cache()

    def _load_cache(self) -> None:
        if not self.cache_path.exists():
            self._cache = {}
            return

        try:
            with open(self.cache_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
                self._cache = {
                    key: DraftEntry.from_dict(value) for key, value in raw.items()
                }
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(f"Failed to load draft cache: {exc}")
            self._cache = {}

    def _persist_cache(self) -> None:
        serializable = {key: entry.to_serializable() for key, entry in self._cache.items()}
        with open(self.cache_path, "w", encoding="utf-8") as f:
            json.dump(serializable, f, indent=2)

    def save_draft(self, document_id: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        metadata = metadata or {}
        entry = DraftEntry(
            document_id=document_id,
            content=content,
            updated_at=datetime.utcnow(),
            metadata=metadata,
        )
        self._cache[document_id] = entry
        self._persist_cache()
        logger.info(f"Saved offline draft for document {document_id}")

    def load_draft(self, document_id: str) -> Optional[DraftEntry]:
        return self._cache.get(document_id)

    def list_drafts(self) -> Dict[str, DraftEntry]:
        return self._cache

    def remove_draft(self, document_id: str) -> None:
        if document_id in self._cache:
            self._cache.pop(document_id)
            self._persist_cache()
            logger.info(f"Removed offline draft for document {document_id}")

    def clear(self) -> None:
        self._cache = {}
        self._persist_cache()
        logger.info("Cleared offline draft cache")
