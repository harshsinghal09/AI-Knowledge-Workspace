from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.providers import gemini_provider
from app.services.embeddings import embed_query
from app.services.retrieval import search_similar_chunks
from app.services.generation import generate_answer

router = APIRouter()


class QueryRequest(BaseModel):
    workspaceId: str
    question: str


class Citation(BaseModel):
    documentId: str
    filename: str
    chunkId: str
    pageNumber: int | None
    excerpt: str


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]


@router.post("/query", response_model=QueryResponse)
async def query_endpoint(payload: QueryRequest):
    try:
        provider = gemini_provider.get_provider()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    try:
        query_vector = await embed_query(provider, payload.question)
        chunks = await search_similar_chunks(payload.workspaceId, query_vector)
        answer = await generate_answer(provider, payload.question, chunks)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}")

    citations = [
        Citation(
            documentId=chunk["documentId"],
            filename=chunk["filename"],
            chunkId=str(chunk["_id"]),
            pageNumber=chunk.get("pageNumber"),
            excerpt=chunk["chunkText"][:300],
        )
        for chunk in chunks
    ]

    return QueryResponse(answer=answer, citations=citations)
