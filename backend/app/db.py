from supabase import Client, create_client

from .config import settings

_client: Client | None = None


def get_supabase() -> Client:
    """Returns a cached Supabase client using the service-role key.

    The backend is the only thing that talks to Postgres directly, so it
    authorizes requests itself (see dependencies.get_current_user_id) rather
    than relying on Supabase RLS for every query. RLS is still enabled on the
    tables (see supabase/schema.sql) as defense-in-depth.
    """
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_service_key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (see .env.example)"
            )
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client
