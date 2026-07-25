from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017/ai_knowledge_workspace"

    gemini_api_key: str = ""
    gemini_embedding_model: str = "text-embedding-004"
    gemini_generation_model: str = "gemini-1.5-flash"

    node_callback_url: str = "http://localhost:5000/api/documents/index-callback"
    internal_service_secret: str = "change_me_shared_secret"

    chunk_size: int = 900
    chunk_overlap: int = 175
    top_k: int = 5
    similarity_threshold: float = 0.55

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
