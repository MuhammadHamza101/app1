"""Background sync engine for offline annotations and uploads.

The engine persists a small JSON queue on disk and replays it when
connectivity resumes. Conflict resolution prefers the most recently
updated payload by comparing timestamps embedded in each task.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from loguru import logger

from .api_client import ApiClient, resilient_async
from .offline_cache import OfflineDraftCache


@dataclass
class SyncTask:
    """Represents a queued offline operation."""

    task_id: str
    kind: str
    payload: Dict[str, Any]
    updated_at: datetime
    attempts: int = 0

    @classmethod
    def create(cls, kind: str, payload: Dict[str, Any]) -> "SyncTask":
        return cls(
            task_id=str(uuid.uuid4()),
            kind=kind,
            payload=payload,
            updated_at=datetime.utcnow(),
        )

    def to_dict(self) -> Dict[str, Any]:
        raw = asdict(self)
        raw["updated_at"] = self.updated_at.isoformat()
        return raw

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "SyncTask":
        return SyncTask(
            task_id=data["task_id"],
            kind=data["kind"],
            payload=data["payload"],
            updated_at=datetime.fromisoformat(data["updated_at"]),
            attempts=data.get("attempts", 0),
        )


class SyncQueue:
    """Simple JSON-backed queue for offline work."""

    def __init__(self, data_dir: Path, filename: str = "sync-queue.json"):
        self.path = data_dir / filename
        self.tasks: List[SyncTask] = []
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            self.tasks = []
            return
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                raw_tasks = json.load(f)
                self.tasks = [SyncTask.from_dict(task) for task in raw_tasks]
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(f"Failed to load sync queue: {exc}")
            self.tasks = []

    def _persist(self) -> None:
        serializable = [task.to_dict() for task in self.tasks]
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(serializable, f, indent=2)

    def enqueue(self, task: SyncTask) -> None:
        self.tasks.append(task)
        self._persist()
        logger.info(f"Enqueued offline task {task.kind} ({task.task_id})")

    def pop(self) -> Optional[SyncTask]:
        if not self.tasks:
            return None
        task = self.tasks.pop(0)
        self._persist()
        return task

    def peek(self) -> Optional[SyncTask]:
        return self.tasks[0] if self.tasks else None

    def remove(self, task_id: str) -> None:
        self.tasks = [task for task in self.tasks if task.task_id != task_id]
        self._persist()


class SyncEngine:
    """Coordinates offline storage, background uploads, and conflict resolution."""

    def __init__(
        self,
        data_dir: Path,
        api_client: ApiClient,
        offline_cache: OfflineDraftCache,
        poll_interval: float = 5.0,
    ):
        self.queue = SyncQueue(data_dir)
        self.api_client = api_client
        self.offline_cache = offline_cache
        self.poll_interval = poll_interval
        self._task: Optional[asyncio.Task] = None
        self._running = False

    def queue_annotation(self, annotation: Dict[str, Any]) -> SyncTask:
        task = SyncTask.create("annotation", annotation)
        self.queue.enqueue(task)
        return task

    def queue_upload(self, payload: Dict[str, Any]) -> SyncTask:
        task = SyncTask.create("upload", payload)
        self.queue.enqueue(task)
        return task

    def queue_analysis_trigger(self, payload: Dict[str, Any]) -> SyncTask:
        task = SyncTask.create("analysis", payload)
        self.queue.enqueue(task)
        return task

    def _resolve_conflict(self, local: SyncTask, remote_updated_at: datetime) -> bool:
        """Return True if local task should be replayed based on freshness."""

        return local.updated_at > remote_updated_at

    async def _process_task(self, task: SyncTask) -> None:
        if task.kind == "annotation":
            await resilient_async(lambda: self.api_client.async_annotation_sync(task.payload))
        elif task.kind == "upload":
            await resilient_async(lambda: self.api_client.async_upload(task.payload))
        elif task.kind == "analysis":
            await resilient_async(lambda: self.api_client.async_upload(task.payload))
        else:  # pragma: no cover - defensive
            logger.warning(f"Unknown sync task kind: {task.kind}")
            return
        logger.info(f"Synced task {task.task_id} ({task.kind})")

    async def _worker(self) -> None:
        self._running = True
        while self._running:
            next_task = self.queue.peek()
            if not next_task:
                await asyncio.sleep(self.poll_interval)
                continue

            try:
                await self._process_task(next_task)
                self.queue.remove(next_task.task_id)
            except Exception as exc:  # pragma: no cover - defensive
                next_task.attempts += 1
                logger.warning(f"Sync task {next_task.task_id} failed ({next_task.attempts} attempts): {exc}")
                if next_task.attempts >= 5:
                    self.queue.remove(next_task.task_id)
                    logger.error(f"Dropping task {next_task.task_id} after repeated failures")
                else:
                    self.queue._persist()
                    await asyncio.sleep(self.poll_interval)

    def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._task = asyncio.create_task(self._worker())
        logger.info("Sync engine started")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            await self._task
        await self.api_client.close()
        logger.info("Sync engine stopped")

    def cache_recent_patent(self, document_id: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Persist patent content locally for offline viewing."""

        self.offline_cache.save_draft(document_id=document_id, content=content, metadata=metadata or {})

