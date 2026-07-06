from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from app.services.indexing import index_document

router = APIRouter()


class IndexDocumentRequest(BaseModel):
    documentId: str
    workspaceId: str
    filePath: str
    mimeType: str
    originalName: str


@router.post("/index-document")
async def index_document_endpoint(payload: IndexDocumentRequest, background_tasks: BackgroundTasks):
    # Immediately acknowledge — actual parsing/embedding happens in the background
    # so Node's request (which is itself fire-and-forget) never waits on this.
    background_tasks.add_task(
        index_document,
        payload.documentId,
        payload.workspaceId,
        payload.filePath,
        payload.mimeType,
        payload.originalName,
    )
    return {"accepted": True}
