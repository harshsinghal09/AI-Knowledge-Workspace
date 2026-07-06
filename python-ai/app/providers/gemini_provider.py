from tenacity import retry, stop_after_attempt, wait_exponential
from google import genai
from google.genai import types
import traceback

from app.core.config import get_settings
from app.providers.base_provider import LLMProvider


class GeminiProvider(LLMProvider):
    """
    Concrete LLMProvider backed by the official Google GenAI SDK.
    Uses Gemini for both embeddings and text generation.
    """

    def __init__(self) -> None:
        settings = get_settings()

        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to python-ai/.env before indexing or querying."
            )

        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._embedding_model = settings.gemini_embedding_model
        self._generation_model = settings.gemini_generation_model

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
    )
    async def embed(self, text: str) -> list[float]:
        result = self._client.models.embed_content(
            model=self._embedding_model,
            contents=text,
        )
        return list(result.embeddings[0].values)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
    )
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        result = self._client.models.embed_content(
            model=self._embedding_model,
            contents=texts,
        )
        return [list(e.values) for e in result.embeddings]

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=6),
    )
    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = self._client.models.generate_content(
                model=self._generation_model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.2,
                ),
            )

            return response.text or ""

        except Exception as e:
            print("\n================ GEMINI GENERATION ERROR ================\n")
            traceback.print_exc()
            print("\n=========================================================\n")
            raise e


_provider_instance: GeminiProvider | None = None


def get_provider() -> LLMProvider:
    global _provider_instance

    if _provider_instance is None:
        _provider_instance = GeminiProvider()

    return _provider_instance