from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Env-driven config. Values come from agent/.env locally and Render env vars in prod."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    llm_provider: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    flight_api_key: str = ""
    maps_api_key: str = ""
    spectrum_api_key: str = ""
    bridge_url: str = "http://localhost:8787"
    agent_shared_secret: str = ""


settings = Settings()
