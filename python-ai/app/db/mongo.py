from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings

_client: AsyncIOMotorClient | None = None


def get_db() -> AsyncIOMotorDatabase:
    """
    Returns the shared Motor database handle. Python owns the `document_chunks`
    collection directly (vector search lives here), while `documents` metadata
    is owned/written by Node — Python only reads/updates status-adjacent fields
    through the callback to Node, never writing document metadata directly.
    """
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(settings.mongo_uri)
    return _client.get_default_database()


async def ensure_indexes() -> None:
    db = get_db()
    await db.document_chunks.create_index("documentId")
    await db.document_chunks.create_index("workspaceId")
