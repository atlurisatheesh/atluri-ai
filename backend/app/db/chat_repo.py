import asyncio
import logging

# from app.db.supabase import supabase

# def save_message(user_id: str, role: str, message: str):
#     supabase.table("chats").insert({
#         "user_id": user_id,
#         "role": role,
#         "message": message
#     }).execute()


# def get_chat_history(user_id: str, limit=50):
#     res = supabase.table("chats") \
#         .select("*") \
#         .eq("user_id", user_id) \
#         .order("created_at", desc=True) \
#         .limit(limit) \
#         .execute()

#     return list(reversed(res.data))



try:
    from app.db.supabase import supabase
except Exception:
    supabase = None


logger = logging.getLogger("app.db.chat_repo")


def save_message(user_id: str, role: str, message: str):
    """
    Safe no-op if Supabase is unavailable
    """
    if not supabase:
        return
    try:
        supabase.table("chats").insert({
            "user_id": user_id,
            "role": role,
            "message": message
        }).execute()
    except Exception as exc:
        logger.warning("save_message failed | user_id=%s err=%s", user_id, exc)


def get_chat_history(user_id: str, limit=50):
    """
    Safe fallback if Supabase is unavailable
    """
    if not supabase:
        return []
    try:
        res = (
            supabase
            .table("chats")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception as exc:
        logger.warning("get_chat_history failed | user_id=%s err=%s", user_id, exc)
        return []

    rows = getattr(res, "data", None)
    return list(reversed(rows or []))


async def save_message_async(user_id: str, role: str, message: str) -> None:
    await asyncio.to_thread(save_message, user_id, role, message)


async def get_chat_history_async(user_id: str, limit: int = 50) -> list[dict]:
    return await asyncio.to_thread(get_chat_history, user_id, limit)
