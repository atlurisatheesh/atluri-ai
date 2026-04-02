"""
Model routing — maps desktop model IDs to actual provider + model name.
Supports OpenAI, Anthropic, Google Gemini, xAI(Grok), and Ollama.
"""
import os
import logging
from dataclasses import dataclass

logger = logging.getLogger("app.router.model_router")

# ─── Provider Constants ─────────────────────────────────────
PROVIDER_OPENAI = "openai"
PROVIDER_ANTHROPIC = "anthropic"
PROVIDER_GEMINI = "gemini"
PROVIDER_XAI = "xai"
PROVIDER_DEEPSEEK = "deepseek"
PROVIDER_MOONSHOT = "moonshot"
PROVIDER_OLLAMA = "ollama"


@dataclass
class ModelSpec:
    provider: str
    api_model: str  # Actual model name sent to the provider API
    paid: bool = False


# ─── Model ID → Provider + API Model Mapping ────────────────
MODEL_MAP: dict[str, ModelSpec] = {
    # General / Default → fast OpenAI model
    "general":          ModelSpec(PROVIDER_OPENAI, "gpt-4o-mini"),
    # OpenAI family
    "gpt-4o":           ModelSpec(PROVIDER_OPENAI, "gpt-4o"),
    "gpt-4.1":          ModelSpec(PROVIDER_OPENAI, "gpt-4.1"),
    "gpt-4.1-mini":     ModelSpec(PROVIDER_OPENAI, "gpt-4.1-mini"),
    "gpt-5":            ModelSpec(PROVIDER_OPENAI, "gpt-4o"),  # Maps to best available
    "gpt-5.1":          ModelSpec(PROVIDER_OPENAI, "gpt-4o", paid=True),
    "gpt-5.2":          ModelSpec(PROVIDER_OPENAI, "gpt-4o", paid=True),
    "gpt-5-mini":       ModelSpec(PROVIDER_OPENAI, "gpt-4o-mini", paid=True),
    # Anthropic family
    "claude-4.5-sonnet": ModelSpec(PROVIDER_ANTHROPIC, "claude-sonnet-4-20250514", paid=True),
    "claude-4.5-haiku":  ModelSpec(PROVIDER_ANTHROPIC, "claude-haiku-4-20250414", paid=True),
    "claude-4.5-opus":   ModelSpec(PROVIDER_ANTHROPIC, "claude-sonnet-4-20250514", paid=True),
    # Gemini family
    "gemini-3-pro":     ModelSpec(PROVIDER_GEMINI, "gemini-2.0-flash", paid=True),
    "gemini-2.5-flash": ModelSpec(PROVIDER_GEMINI, "gemini-2.0-flash"),
    "gemini-3-flash":   ModelSpec(PROVIDER_GEMINI, "gemini-2.0-flash"),
    # xAI (Grok)
    "grok-4":           ModelSpec(PROVIDER_XAI, "grok-3"),
    "grok-4.1-fast":    ModelSpec(PROVIDER_XAI, "grok-3-fast"),
    # DeepSeek
    "deepseek-chat":    ModelSpec(PROVIDER_DEEPSEEK, "deepseek-chat"),
    # Moonshot (Kimi)
    "kimi-k2-turbo":    ModelSpec(PROVIDER_MOONSHOT, "moonshot-v1-128k"),
    # Ollama local
    "ollama-local":     ModelSpec(PROVIDER_OLLAMA, "llama3.1"),
}

# Default fallback
DEFAULT_SPEC = ModelSpec(PROVIDER_OPENAI, "gpt-4o-mini")


def resolve_model(model_id: str | None) -> ModelSpec:
    """Resolve a desktop model ID to provider + actual API model."""
    if not model_id:
        return DEFAULT_SPEC
    spec = MODEL_MAP.get(model_id, DEFAULT_SPEC)
    logger.debug("resolve_model(%s) → %s/%s", model_id, spec.provider, spec.api_model)
    return spec


def is_provider_available(provider: str) -> bool:
    """Check if the API key for a given provider is set."""
    key_map = {
        PROVIDER_OPENAI: "OPENAI_API_KEY",
        PROVIDER_ANTHROPIC: "ANTHROPIC_API_KEY",
        PROVIDER_GEMINI: "GEMINI_API_KEY",
        PROVIDER_XAI: "XAI_API_KEY",
        PROVIDER_DEEPSEEK: "DEEPSEEK_API_KEY",
        PROVIDER_MOONSHOT: "MOONSHOT_API_KEY",
    }
    env_var = key_map.get(provider)
    if not env_var:
        return provider == PROVIDER_OLLAMA  # Ollama doesn't need a key
    return bool(os.getenv(env_var))


def get_fallback_spec(spec: ModelSpec) -> ModelSpec:
    """If a provider isn't available, fall back to OpenAI."""
    if is_provider_available(spec.provider):
        return spec
    logger.warning(
        "Provider %s not available (missing API key), falling back to OpenAI",
        spec.provider,
    )
    return DEFAULT_SPEC
