import math

from app.db import mongo as mongo_db
from app.core.config import get_settings


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def search_similar_chunks(workspace_id: str, query_vector: list[float]) -> list[dict]:
    """
    Uses MongoDB Atlas Vector Search when available ($vectorSearch aggregation
    stage). Falls back to manual cosine-similarity ranking in-process, so the
    project also runs against a local/non-Atlas MongoDB (e.g. in Docker Compose
    for local development) without requiring an Atlas cluster.
    """
    settings = get_settings()
    db = mongo_db.get_db()

    try:
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": 100,
                    "limit": settings.top_k,
                    "filter": {"workspaceId": workspace_id},
                }
            },
            {"$addFields": {"score": {"$meta": "vectorSearchScore"}}},
        ]
        cursor = db.document_chunks.aggregate(pipeline)
        results = [doc async for doc in cursor]
        if results:
            return [r for r in results if r.get("score", 0) >= settings.similarity_threshold]
    except Exception:
        pass

    # Fallback: manual cosine similarity over this workspace's chunks.
    candidates = [doc async for doc in db.document_chunks.find({"workspaceId": workspace_id})]
    scored = [
        {**doc, "score": cosine_similarity(query_vector, doc["embedding"])}
        for doc in candidates
    ]
    scored.sort(key=lambda d: d["score"], reverse=True)
    top = scored[: settings.top_k]
    return [d for d in top if d["score"] >= settings.similarity_threshold]
