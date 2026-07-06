import traceback

from app.providers.base_provider import LLMProvider


async def embed_chunks(provider: LLMProvider, texts: list[str]) -> list[list[float]]:
    """Batches embedding calls; falls back to one-by-one if the batch call fails."""

    try:
        return await provider.embed_batch(texts)

    except Exception:
        traceback.print_exc()

        vectors = []

        for text in texts:
            try:
                vectors.append(await provider.embed(text))
            except Exception:
                traceback.print_exc()
                raise

        return vectors


async def embed_query(provider: LLMProvider, question: str) -> list[float]:
    try:
        return await provider.embed(question)
    except Exception:
        traceback.print_exc()
        raise