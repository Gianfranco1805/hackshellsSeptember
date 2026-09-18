import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "*")
    public_base_url: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:5173")


settings = Settings()
