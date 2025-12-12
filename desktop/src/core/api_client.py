"""API client for desktop parity with web workspace.

Provides both synchronous and asynchronous helpers so the PyQt desktop
application can talk to the platform's authentication, search, analysis,
and annotation endpoints. The client intentionally keeps surface area
small while handling session propagation and tracing metadata.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Dict, Optional

import aiohttp
import requests
from loguru import logger

from .config import ApiConfig


@dataclass
class AuthSession:
    """Represents an authenticated session shared with the desktop app."""

    access_token: str
    refresh_token: Optional[str] = None


class ApiClient:
    """Lightweight HTTP client for backend APIs."""

    def __init__(self, api_config: ApiConfig, auth_session: Optional[AuthSession] = None):
        self.api_config = api_config
        self.session = auth_session
        self._aiohttp_session: Optional[aiohttp.ClientSession] = None

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.session and self.session.access_token:
            headers["Authorization"] = f"Bearer {self.session.access_token}"
        return headers

    def _log_request(self, method: str, url: str) -> None:
        logger.debug(f"{method} {url} (desktop client)")

    def search(self, query: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Call the platform search API synchronously."""

        url = f"{self.api_config.search_base_url}"
        payload = {"query": query, **(params or {})}
        self._log_request("POST", url)
        response = requests.post(url, json=payload, timeout=30, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def submit_analysis(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Submit document for analysis and receive a job identifier."""

        url = f"{self.api_config.analysis_base_url}"
        self._log_request("POST", url)
        response = requests.post(url, json=document, timeout=60, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def create_annotation(self, annotation: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new annotation."""

        url = f"{self.api_config.annotation_base_url}"
        self._log_request("POST", url)
        response = requests.post(url, json=annotation, timeout=20, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def update_annotation(self, annotation_id: str, annotation: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing annotation."""

        url = f"{self.api_config.annotation_base_url}/{annotation_id}"
        self._log_request("PATCH", url)
        response = requests.patch(url, json=annotation, timeout=20, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def get_report(self, report_id: str) -> Dict[str, Any]:
        """Fetch analysis report metadata and content."""

        url = f"{self.api_config.report_base_url}/{report_id}"
        self._log_request("GET", url)
        response = requests.get(url, timeout=30, headers=self._headers())
        response.raise_for_status()
        return response.json()

    async def _get_aiohttp_session(self) -> aiohttp.ClientSession:
        if self._aiohttp_session is None:
            self._aiohttp_session = aiohttp.ClientSession(headers=self._headers())
        return self._aiohttp_session

    async def async_annotation_sync(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Async helper for annotation pushes from background worker."""

        session = await self._get_aiohttp_session()
        url = f"{self.api_config.annotation_base_url}"
        self._log_request("POST", url)
        async with session.post(url, json=payload, timeout=20) as resp:
            resp.raise_for_status()
            return await resp.json()

    async def async_upload(self, file_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Async helper for document uploads/analysis triggers."""

        session = await self._get_aiohttp_session()
        url = f"{self.api_config.analysis_base_url}/upload"
        self._log_request("POST", url)
        async with session.post(url, json=file_payload, timeout=60) as resp:
            resp.raise_for_status()
            return await resp.json()

    async def close(self) -> None:
        if self._aiohttp_session:
            await self._aiohttp_session.close()
            self._aiohttp_session = None


async def resilient_async(fn, retries: int = 3, delay: float = 2.0):
    """Retry helper for async API calls."""

    last_exc: Optional[BaseException] = None
    for attempt in range(1, retries + 1):
        try:
            return await fn()
        except Exception as exc:  # pragma: no cover - defensive
            last_exc = exc
            logger.warning(f"Async API attempt {attempt} failed: {exc}")
            await asyncio.sleep(delay)
    raise last_exc or RuntimeError("Async API call failed")
