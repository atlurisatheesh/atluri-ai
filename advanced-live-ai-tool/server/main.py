from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from routes import auth, ai, sessions, documents, resume, mock, billing, questions, analytics, duo


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"📡 CORS origins: {settings.ALLOWED_ORIGINS}")
    yield
    print("👋 Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="The most advanced AI Interview Copilot — NeuralWhisper™, PhantomVeil™, CodeForge™, MentorLink™",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route modules
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Engine"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(documents.router, prefix="/api/documents", tags=["DocuMind™"])
app.include_router(resume.router, prefix="/api/resume", tags=["ProfileCraft™"])
app.include_router(mock.router, prefix="/api/mock", tags=["SimuDrill™"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])
app.include_router(questions.router, prefix="/api/questions", tags=["PrepVault™"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(duo.router, prefix="/api/duo", tags=["MentorLink™"])


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
