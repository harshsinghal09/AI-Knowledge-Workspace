import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from mongomock_motor import AsyncMongoMockClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.retrieval import search_similar_chunks, cosine_similarity
from app.services.generation import generate_answer


class FakeProvider:
    async def embed(self, text: str) -> list[float]:
        return [1.0, 2.0]

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        assert "Context:" in user_prompt
        return "Grounded answer referencing the context."


@pytest.fixture
def fake_db():
    client = AsyncMongoMockClient()
    return client["ai_knowledge_workspace_test"]


def test_cosine_similarity_identical_vectors_is_one():
    assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)


def test_cosine_similarity_orthogonal_vectors_is_zero():
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)


def test_cosine_similarity_handles_zero_vector_without_crashing():
    assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0


@pytest.mark.asyncio
async def test_search_enforces_workspace_isolation(fake_db):
    with patch("app.db.mongo.get_db", return_value=fake_db):
        await fake_db.document_chunks.insert_many(
            [
                {
                    "documentId": "docA",
                    "workspaceId": "ws-mine",
                    "filename": "mine.txt",
                    "chunkText": "This belongs to my workspace.",
                    "chunkIndex": 0,
                    "pageNumber": None,
                    "embedding": [1.0, 2.0],
                },
                {
                    "documentId": "docB",
                    "workspaceId": "ws-other",
                    "filename": "other.txt",
                    "chunkText": "This belongs to someone else's workspace.",
                    "chunkIndex": 0,
                    "pageNumber": None,
                    "embedding": [1.0, 2.0],
                },
            ]
        )

        results = await search_similar_chunks("ws-mine", [1.0, 2.0])

        assert len(results) == 1
        assert all(r["workspaceId"] == "ws-mine" for r in results)


@pytest.mark.asyncio
async def test_search_returns_empty_when_workspace_has_no_chunks(fake_db):
    with patch("app.db.mongo.get_db", return_value=fake_db):
        results = await search_similar_chunks("empty-ws", [1.0, 2.0])
        assert results == []


@pytest.mark.asyncio
async def test_generate_answer_skips_llm_call_when_no_chunks():
    provider = FakeProvider()
    answer = await generate_answer(provider, "What is JWT?", chunks=[])
    assert answer == "I couldn't find this information in your uploaded documents."


@pytest.mark.asyncio
async def test_generate_answer_calls_llm_when_chunks_present():
    provider = FakeProvider()
    chunks = [
        {"filename": "doc.txt", "pageNumber": None, "chunkText": "JWT is a token format."}
    ]
    answer = await generate_answer(provider, "What is JWT?", chunks)
    assert answer == "Grounded answer referencing the context."
