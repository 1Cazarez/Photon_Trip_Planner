from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache
def get_db() -> Client:
    """Service-role Supabase client. Bypasses RLS, so never expose it to the web app."""
    # TODO(J, #1): schema v1 lives in supabase/migrations; generate types once it lands.
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
