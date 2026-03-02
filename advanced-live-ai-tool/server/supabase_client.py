"""Supabase client initialization for server-side operations."""
from config import settings

supabase_client = None

def get_supabase():
    """Lazy-init Supabase client."""
    global supabase_client
    if supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
            return None
        try:
            from supabase import create_client
            supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        except ImportError:
            print("⚠️  supabase package not installed. Using local DB only.")
            return None
    return supabase_client
