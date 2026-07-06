import httpx
import traceback

from app.core.config import get_settings
from app.db import mongo as mongo_db
from app.providers import gemini_provider
from app.services.parsing import extract_text, clean_text, UnsupportedFileTypeError, EmptyDocumentError
from app.services.chunking import chunk_pages
from app.services.embeddings import embed_chunks


async def index_document(document_id: str, workspace_id: str, file_path: str, mime_type: str) -> None:
    """
    Runs as a background task. Node has already returned 202 to the client —
    this function's only job is to end with a callback to Node reporting
    'ready' or 'failed'. It must never raise past its own boundary.
    """
    settings = get_settings()

    try:
        pages = extract_text(file_path, mime_type)
        cleaned_pages = [(clean_text(text), page_num) for text, page_num in pages]

        chunks = chunk_pages(cleaned_pages, settings.chunk_size, settings.chunk_overlap)
        if not chunks:
            raise EmptyDocumentError("No usable text extracted after cleaning")

        provider = gemini_provider.get_provider()
        vectors = await embed_chunks(provider, [c.text for c in chunks])

        db = mongo_db.get_db()
        filename = file_path.split("/")[-1]

        docs_to_insert = [
            {
                "documentId": document_id,
                "workspaceId": workspace_id,
                "filename": filename,
                "chunkText": chunk.text,
                "chunkIndex": chunk.chunk_index,
                "pageNumber": chunk.page_number,
                "embedding": vector,
            }
            for chunk, vector in zip(chunks, vectors)
        ]

        # Replace any previous chunks for this document (idempotent re-indexing).
        await db.document_chunks.delete_many({"documentId": document_id})
        await db.document_chunks.insert_many(docs_to_insert)

        await _report_status(document_id, "ready", None)

    except (UnsupportedFileTypeError, EmptyDocumentError) as e:
        await _report_status(document_id, "failed", str(e))
    except Exception as e:
        traceback.print_exc()

        await _report_status(
            document_id,
            "failed",
            f"Indexing failed: {e}",
        )


async def _report_status(document_id: str, status: str, error_message: str | None) -> None:
    settings = get_settings()
    payload = {"documentId": document_id, "status": status, "errorMessage": error_message}
    headers = {"x-internal-secret": settings.internal_service_secret}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(settings.node_callback_url, json=payload, headers=headers)
    except Exception:
        # If the callback itself fails, the document stays "processing" and the
        # user's polling will time out visibly rather than silently — this is
        # logged so an operator can investigate, but must not crash the worker.
        pass
