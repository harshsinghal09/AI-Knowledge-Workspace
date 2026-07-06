import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from mongomock_motor import AsyncMongoMockClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.indexing import index_document


class FakeProvider:
    """Deterministic stand-in for GeminiProvider so tests never call a real API."""

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [[float(i), float(len(t))] for i, t in enumerate(texts)]

    async def embed(self, text: str) -> list[float]:
        return [1.0, float(len(text))]

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        return "Fake grounded answer."


@pytest.fixture
def fake_db():
    client = AsyncMongoMockClient()
    return client["ai_knowledge_workspace_test"]


@pytest.fixture(autouse=True)
def sample_files(tmp_path):
    good = tmp_path / "sample.txt"
    good.write_text(
        "JWT stands for JSON Web Token. It is used for authentication between parties."
    )
    empty = tmp_path / "empty.txt"
    empty.write_text("   ")
    return {"good": str(good), "empty": str(empty), "missing": str(tmp_path / "nope.pdf")}


@pytest.mark.asyncio
async def test_index_document_success_reports_ready(fake_db, sample_files):
    with patch("app.db.mongo.get_db", return_value=fake_db), patch(
        "app.providers.gemini_provider.get_provider", return_value=FakeProvider()
    ), patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        await index_document("doc1", "ws1", sample_files["good"], "text/plain")

        chunks = await fake_db.document_chunks.find({"documentId": "doc1"}).to_list(length=100)
        assert len(chunks) >= 1
        assert all("embedding" in c for c in chunks)

        payload = mock_post.call_args.kwargs["json"]
        assert payload == {"documentId": "doc1", "status": "ready", "errorMessage": None}


@pytest.mark.asyncio
async def test_index_document_empty_file_reports_failed(fake_db, sample_files):
    with patch("app.db.mongo.get_db", return_value=fake_db), patch(
        "app.providers.gemini_provider.get_provider", return_value=FakeProvider()
    ), patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        await index_document("doc2", "ws1", sample_files["empty"], "text/plain")

        payload = mock_post.call_args.kwargs["json"]
        assert payload["status"] == "failed"
        assert "empty" in payload["errorMessage"].lower()


@pytest.mark.asyncio
async def test_index_document_unsupported_type_reports_failed(fake_db, sample_files):
    with patch("app.db.mongo.get_db", return_value=fake_db), patch(
        "app.providers.gemini_provider.get_provider", return_value=FakeProvider()
    ), patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        bad_path = sample_files["good"].replace(".txt", ".xyz")
        await index_document("doc3", "ws1", bad_path, "application/octet-stream")

        payload = mock_post.call_args.kwargs["json"]
        assert payload["status"] == "failed"
        assert "unsupported" in payload["errorMessage"].lower()


@pytest.mark.asyncio
async def test_index_document_missing_file_reports_failed_without_crashing(fake_db, sample_files):
    with patch("app.db.mongo.get_db", return_value=fake_db), patch(
        "app.providers.gemini_provider.get_provider", return_value=FakeProvider()
    ), patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        # Must never raise past its own boundary, even for an unexpected I/O error.
        await index_document("doc4", "ws1", sample_files["missing"], "application/pdf")

        payload = mock_post.call_args.kwargs["json"]
        assert payload["status"] == "failed"


@pytest.mark.asyncio
async def test_reindexing_replaces_old_chunks_instead_of_duplicating(fake_db, sample_files):
    with patch("app.db.mongo.get_db", return_value=fake_db), patch(
        "app.providers.gemini_provider.get_provider", return_value=FakeProvider()
    ), patch("httpx.AsyncClient.post", new_callable=AsyncMock):
        await index_document("doc5", "ws1", sample_files["good"], "text/plain")
        first_count = await fake_db.document_chunks.count_documents({"documentId": "doc5"})
        assert first_count >= 1  # guards against a silent no-op passing this test

        await index_document("doc5", "ws1", sample_files["good"], "text/plain")
        second_count = await fake_db.document_chunks.count_documents({"documentId": "doc5"})

        assert first_count == second_count  # not doubled by re-indexing
