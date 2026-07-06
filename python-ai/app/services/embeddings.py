from app.providers.base_provider import LLMProvider


async def embed_chunks(provider: LLMProvider, texts: list[str]) -> list[list[float]]:
    """Batches embedding calls; falls back to one-by-one if the batch call fails,
    so a single bad chunk doesn't fail the whole document."""
    try:
        return await provider.embed_batch(texts)
    except Exception:
        vectors = []
        for text in texts:
            vectors.append(await provider.embed(text))
        return vectors


async def embed_query(provider: LLMProvider, question: str) -> list[float]:
    return await provider.embed(question)
