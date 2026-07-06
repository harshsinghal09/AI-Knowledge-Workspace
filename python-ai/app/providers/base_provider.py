from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """
    Abstract interface every part of the app depends on. Concrete implementations
    (Gemini today, anything else tomorrow) live behind this boundary so swapping
    providers means changing exactly one file, not the rest of the codebase.
    """

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Return an embedding vector for a single piece of text."""

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Return embedding vectors for a batch of texts."""

    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Return a generated text completion given system + user prompts."""
