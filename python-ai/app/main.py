from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import health, index_document, query
from app.db.mongo import ensure_indexes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield


app = FastAPI(title="AI Knowledge Workspace - AI Service", version="1.0.0", lifespan=lifespan)

app.include_router(health.router)
app.include_router(index_document.router)
app.include_router(query.router)
