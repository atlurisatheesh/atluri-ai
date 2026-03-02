"""Question Bank API routes: browse, save, spaced repetition."""

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/api/questions", tags=["questions"])

# ── In-memory store (swap to DB later) ──────────────────
_questions_db: dict[str, dict] = {}
_saved_db: dict[str, list[str]] = {}  # user_id -> [question_ids]
_review_schedule: dict[str, dict] = {}  # user_id::question_id -> schedule

# ── Seed data ───────────────────────────────────────────
CATEGORIES = ["behavioral", "system-design", "coding", "leadership", "product", "technical"]
DIFFICULTIES = ["easy", "medium", "hard", "expert"]
COMPANIES = ["general", "amazon", "google", "meta", "microsoft", "apple", "netflix", "stripe"]

SEED_QUESTIONS = [
    {"title": "Tell me about a time you led a project", "category": "behavioral", "difficulty": "medium", "company": "general", "tags": ["leadership", "star"]},
    {"title": "Design a URL shortener", "category": "system-design", "difficulty": "medium", "company": "google", "tags": ["scalability", "api-design"]},
    {"title": "Two Sum problem", "category": "coding", "difficulty": "easy", "company": "general", "tags": ["arrays", "hash-map"]},
    {"title": "Describe a conflict with a teammate", "category": "behavioral", "difficulty": "medium", "company": "amazon", "tags": ["leadership-principles", "earn-trust"]},
    {"title": "Design Instagram feed", "category": "system-design", "difficulty": "hard", "company": "meta", "tags": ["newsfeed", "ranking"]},
    {"title": "Reverse a linked list", "category": "coding", "difficulty": "easy", "company": "general", "tags": ["linked-list", "pointers"]},
    {"title": "How would you prioritize features?", "category": "product", "difficulty": "medium", "company": "meta", "tags": ["product-sense", "prioritization"]},
    {"title": "Design a rate limiter", "category": "system-design", "difficulty": "hard", "company": "stripe", "tags": ["rate-limiting", "distributed"]},
    {"title": "Merge K sorted lists", "category": "coding", "difficulty": "hard", "company": "google", "tags": ["heap", "merge"]},
    {"title": "Walk me through your favorite LP", "category": "leadership", "difficulty": "medium", "company": "amazon", "tags": ["leadership-principles"]},
    {"title": "Design a chat messaging system", "category": "system-design", "difficulty": "hard", "company": "microsoft", "tags": ["websocket", "messaging"]},
    {"title": "LRU Cache implementation", "category": "coding", "difficulty": "medium", "company": "general", "tags": ["cache", "data-structure"]},
    {"title": "How do you handle ambiguity?", "category": "behavioral", "difficulty": "medium", "company": "apple", "tags": ["ambiguity", "decision-making"]},
    {"title": "Design a notification system", "category": "system-design", "difficulty": "medium", "company": "netflix", "tags": ["push-notifications", "pubsub"]},
    {"title": "Binary tree maximum path sum", "category": "coding", "difficulty": "hard", "company": "google", "tags": ["tree", "recursion"]},
    {"title": "Tell me about a time you failed", "category": "behavioral", "difficulty": "easy", "company": "general", "tags": ["failure", "growth"]},
    {"title": "Design a web crawler", "category": "system-design", "difficulty": "hard", "company": "google", "tags": ["distributed", "crawling"]},
    {"title": "Implement a trie", "category": "coding", "difficulty": "medium", "company": "general", "tags": ["trie", "string"]},
    {"title": "How do you measure success?", "category": "product", "difficulty": "medium", "company": "meta", "tags": ["metrics", "kpi"]},
    {"title": "Design an e-commerce search", "category": "system-design", "difficulty": "hard", "company": "amazon", "tags": ["search", "ranking"]},
]

def _seed():
    if _questions_db:
        return
    for q in SEED_QUESTIONS:
        qid = str(uuid.uuid4())
        _questions_db[qid] = {
            "id": qid,
            "title": q["title"],
            "category": q["category"],
            "difficulty": q["difficulty"],
            "company": q["company"],
            "tags": q["tags"],
            "created_at": datetime.utcnow().isoformat(),
        }

_seed()


# ── Models ──────────────────────────────────────────────
class QuestionOut(BaseModel):
    id: str
    title: str
    category: str
    difficulty: str
    company: str
    tags: List[str]
    saved: bool = False


class QuestionListOut(BaseModel):
    items: List[QuestionOut]
    total: int
    categories: List[str] = CATEGORIES
    difficulties: List[str] = DIFFICULTIES
    companies: List[str] = COMPANIES


class SaveToggleOut(BaseModel):
    question_id: str
    saved: bool


class ReviewItem(BaseModel):
    question_id: str
    title: str
    next_review: str
    interval_days: int


# ── Helper: get user_id from request (simplified) ──────
def _get_user_id():
    return "default-user"


# ── Routes ──────────────────────────────────────────────
@router.get("/browse", response_model=QuestionListOut)
async def browse_questions(
    category: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Browse question bank with optional filters."""
    user_id = _get_user_id()
    saved_ids = set(_saved_db.get(user_id, []))
    items = list(_questions_db.values())

    if category:
        items = [q for q in items if q["category"] == category]
    if difficulty:
        items = [q for q in items if q["difficulty"] == difficulty]
    if company:
        items = [q for q in items if q["company"] == company]
    if search:
        sl = search.lower()
        items = [q for q in items if sl in q["title"].lower() or any(sl in t for t in q["tags"])]

    total = len(items)
    page = items[offset : offset + limit]

    return QuestionListOut(
        items=[
            QuestionOut(
                id=q["id"],
                title=q["title"],
                category=q["category"],
                difficulty=q["difficulty"],
                company=q["company"],
                tags=q["tags"],
                saved=q["id"] in saved_ids,
            )
            for q in page
        ],
        total=total,
    )


@router.post("/save/{question_id}", response_model=SaveToggleOut)
async def toggle_save(question_id: str):
    """Toggle save/unsave a question for the user."""
    if question_id not in _questions_db:
        raise HTTPException(status_code=404, detail="Question not found")

    user_id = _get_user_id()
    if user_id not in _saved_db:
        _saved_db[user_id] = []

    if question_id in _saved_db[user_id]:
        _saved_db[user_id].remove(question_id)
        return SaveToggleOut(question_id=question_id, saved=False)
    else:
        _saved_db[user_id].append(question_id)
        return SaveToggleOut(question_id=question_id, saved=True)


@router.get("/saved", response_model=QuestionListOut)
async def get_saved():
    """Get user's saved questions."""
    user_id = _get_user_id()
    saved_ids = set(_saved_db.get(user_id, []))
    items = [q for q in _questions_db.values() if q["id"] in saved_ids]

    return QuestionListOut(
        items=[
            QuestionOut(
                id=q["id"],
                title=q["title"],
                category=q["category"],
                difficulty=q["difficulty"],
                company=q["company"],
                tags=q["tags"],
                saved=True,
            )
            for q in items
        ],
        total=len(items),
    )


@router.get("/review", response_model=List[ReviewItem])
async def get_review_schedule():
    """Get spaced-repetition review queue."""
    user_id = _get_user_id()
    saved_ids = _saved_db.get(user_id, [])
    now = datetime.utcnow()
    result = []

    for qid in saved_ids:
        key = f"{user_id}::{qid}"
        sched = _review_schedule.get(key)
        if not sched:
            # New: review in 1 day
            sched = {"next": now + timedelta(days=1), "interval": 1}
            _review_schedule[key] = sched

        q = _questions_db.get(qid)
        if q:
            result.append(
                ReviewItem(
                    question_id=qid,
                    title=q["title"],
                    next_review=sched["next"].isoformat(),
                    interval_days=sched["interval"],
                )
            )

    # Sort by nearest review first
    result.sort(key=lambda r: r.next_review)
    return result


@router.post("/review/{question_id}/complete")
async def complete_review(question_id: str, quality: int = Query(3, ge=1, le=5)):
    """Mark a question as reviewed. quality 1-5 adjusts interval."""
    user_id = _get_user_id()
    key = f"{user_id}::{question_id}"
    now = datetime.utcnow()

    sched = _review_schedule.get(key, {"next": now, "interval": 1})
    # SM-2 simplified: double interval for quality >= 3, reset for < 3
    if quality >= 3:
        new_interval = min(sched["interval"] * 2, 30)
    else:
        new_interval = 1

    _review_schedule[key] = {"next": now + timedelta(days=new_interval), "interval": new_interval}
    return {"status": "ok", "next_review_days": new_interval}
