# from supabase import create_client
# # import os

# # SUPABASE_URL = os.getenv("SUPABASE_URL")
# # SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# # supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)



# # from supabase._sync.client import SyncClient as SupabaseClient
# from supabase.lib.client_options import ClientOptions
# import os

# supabase = SupabaseClient(
#     supabase_url=os.getenv("SUPABASE_URL"),
#     supabase_key=os.getenv("SUPABASE_KEY"),
#     options=ClientOptions(
#         schema="public"
#     )
# )

"""
Supabase client (DISABLED TEMPORARILY)

Reason:
- Supabase realtime depends on websockets>=11
- Deepgram v2 requires websockets<=10.x
- These cannot coexist in the same process

This file keeps imports safe so the app can boot.
Supabase can be re-enabled later via:
- separate service
- background worker
- or HTTP-only Supabase access
"""

supabase = None
