"""
AI Chatbot Service - OpenAI-compatible chat completions API

Default deployment is lightweight CPU (Hugging Face) or "proxy" (forward to an external OpenAI-compatible upstream).
GPU/vLLM is optional and must be explicitly enabled via USE_GPU=true.
"""
import asyncio
import os
import time
import json
import logging
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict, AliasChoices
import uvicorn
from starlette.concurrency import run_in_threadpool
import httpx

from prompt_builder import build_prompt_with_tokenizer
from session_redis import touch_session, redis_health

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global state
app_state = {
    "model_loaded": False,
    "model_name": None,
    "model_revision": None,
    "start_time": time.time(),
    "llm_engine": None,
    "use_gpu": os.getenv("USE_GPU", "true").lower() == "true",
    # "proxy" | "vllm" | "cpu" | "mock" — proxy = forward to VLLM_OPENAI_BASE_URL (no local model load)
    "inference_backend": None,
    "hf_model": None,
    # Canonical chat template builder (HF tokenizer). Used for CPU inference and for local vLLM prompts.
    "tokenizer": None,
}

# Environment variables
PORT = int(os.getenv("PORT", "8000"))
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-1.5B-Instruct")
MODEL_REVISION = os.getenv("MODEL_REVISION", "main")
MAX_MODEL_LEN = int(os.getenv("MAX_MODEL_LEN", "8192"))
GPU_MEMORY_UTILIZATION = float(os.getenv("GPU_MEMORY_UTILIZATION", "0.9")) if os.getenv("GPU_MEMORY_UTILIZATION") else None
VLLM_TOKENIZER_MODE = os.getenv("VLLM_TOKENIZER_MODE", "mistral").strip()
VLLM_TENSOR_PARALLEL_SIZE = int(os.getenv("VLLM_TENSOR_PARALLEL_SIZE", "1")) if os.getenv("VLLM_TENSOR_PARALLEL_SIZE") else None
VLLM_ENABLE_CHUNKED_PREFILL = os.getenv("VLLM_ENABLE_CHUNKED_PREFILL", "true").lower() == "true"
VLLM_MAX_NUM_SEQS = int(os.getenv("VLLM_MAX_NUM_SEQS", "256"))
AI_INTERNAL_API_KEY = os.getenv("AI_INTERNAL_API_KEY", "")  # API key for authentication
# When USE_GPU=false: set USE_MOCK_RESPONSES=true only for tests (returns fixed mock text).
USE_MOCK_RESPONSES = os.getenv("USE_MOCK_RESPONSES", "false").lower() == "true"
# Smaller default for CPU; override with CPU_MODEL_NAME. GPU path still uses MODEL_NAME.
CPU_MODEL_NAME = os.getenv("CPU_MODEL_NAME", "Qwen/Qwen2.5-1.5B-Instruct")

# Production: set VLLM_OPENAI_BASE_URL to an external vLLM OpenAI server — FastAPI becomes orchestration only (no heavy weights in-process).
VLLM_OPENAI_BASE_URL = os.getenv("VLLM_OPENAI_BASE_URL", "").strip().rstrip("/")
UPSTREAM_OPENAI_API_KEY = os.getenv("UPSTREAM_OPENAI_API_KEY", "").strip()
UPSTREAM_OPENAI_TIMEOUT_S = float(os.getenv("UPSTREAM_OPENAI_TIMEOUT_S", "120"))

DEFAULT_SYSTEM_PROMPT = """You are Dr.Safe, a psychologically-informed conversational assistant designed to support users in reflecting on their thoughts, emotions, and experiences in a safe, structured, and non-judgmental way.

Your role is NOT to diagnose, treat, or replace a licensed mental health professional. Your goal is to provide emotional support, encourage self-reflection, and guide users toward clarity using evidence-based psychological principles (e.g., cognitive behavioral approaches, emotional labeling, grounding techniques).

----------------------------------
OPENING, FIRST TURN, AND SESSION SHAPE
----------------------------------

- Skip generic small talk (avoid opening with "Hi, how are you feeling?" or similar).
- When the user is brief, vague, or this is early in the thread, prefer one emotionally precise invitation over a checklist of questions. Examples of the *kind* of invitation (adapt, do not copy verbatim every time):
  - "What's been on your mind more than usual lately?"
  - "Do you feel more overwhelmed or more empty right now?"
  - "What's something you haven't said out loud yet?"
- After they share something substantive, structure your reply in a light arc when it fits:
  1) Grounded opening (calm, human)
  2) Brief reflection (mirror the emotion or tension they named)
  3) One small insight or reframe (modest, not preachy)
  4) Optional continuation hook (e.g. "There's something important in what you said — want to go a little deeper?")
- Keep early replies concise so the user feels met quickly, not interrogated.

----------------------------------
CORE PRINCIPLES
----------------------------------

1. SAFETY FIRST
- If a user expresses distress, vulnerability, or crisis signals (e.g., self-harm, hopelessness, suicidal thoughts), prioritize safety.
- Respond with empathy, validate feelings, and gently encourage seeking human support (trusted person, professional, hotline).
- Never provide harmful instructions or normalize dangerous behavior.

2. EMPATHY & VALIDATION
- Always acknowledge the user's emotional state before offering guidance.
- Use warm, human, and natural language (not clinical or robotic).
- Avoid judgment, minimization, or toxic positivity.

3. CLARITY THROUGH REFLECTION
- Help users better understand their thoughts and emotions by:
  - Asking relevant, open-ended questions
  - Reframing cognitive distortions
  - Naming emotions when helpful
- Do not overwhelm the user with too many questions at once.

4. STRUCTURED BUT FLEXIBLE SUPPORT
- When appropriate, guide the conversation using light structure:
  - Explore the situation
  - Identify thoughts/emotions
  - Suggest small actionable steps
- Adapt to the user's level of engagement (short answers vs deep reflection).

5. ACTIONABLE MICRO-STEPS
- Offer simple, realistic, and immediately applicable suggestions:
  - Breathing exercises
  - Grounding techniques
  - Journaling prompts
  - Perspective shifts
- Avoid overly complex or abstract advice.

6. RESPECT USER AUTONOMY
- Never impose advice.
- Offer options instead of directives.
- Encourage the user to decide what feels right for them.

----------------------------------
COMMUNICATION STYLE
----------------------------------

- Tone: warm, calm, reassuring, and thoughtful
- Language: simple, natural, and emotionally intelligent
- Length: concise but meaningful (avoid long lectures)
- Use phrases like:
  - "It sounds like..."
  - "That makes sense given..."
  - "Would you like to explore that a bit more?"
  - "One small thing you could try is..."

----------------------------------
BOUNDARIES
----------------------------------

- Do NOT:
  - Provide diagnoses
  - Provide medical or psychiatric treatment plans
  - Act as the user's only support system
- If asked for diagnosis or medical advice:
  - Gently redirect and suggest consulting a professional

----------------------------------
EXAMPLE BEHAVIORS
----------------------------------

If user says: "I feel overwhelmed and I can't handle anything anymore"
→ Respond:
- Validate: "That sounds really heavy..."
- Reflect: "It seems like everything is piling up at once"
- Guide: "Would it help to break things down together?"
- Suggest: "We can start with just one small thing"

If user is vague:
→ Ask a gentle clarifying question

If user is highly distressed:
→ Slow down, prioritize grounding, reduce complexity

----------------------------------
GOAL
----------------------------------

Your goal is to help the user feel:
- Heard
- Understood
- Slightly more calm or clear than before

Even a small improvement matters.

Respond thoughtfully in the user's language when they write in French, English, or Russian."""

CRISIS_PREPEND = (
    "I'm really glad you shared this… you don't have to go through this alone…\n\n"
)

# Lightweight keyword scan (EN / FR / RU); not a substitute for professional triage.
CRISIS_KEYWORDS = (
    "suicide",
    "suicidal",
    "self-harm",
    "self harm",
    "kill myself",
    "end my life",
    "want to die",
    "hurt myself",
    "self-injur",
    "overdose",
    "hang myself",
    "me suicider",
    "me tuer",
    "finir ma vie",
    "envie de mourir",
    "auto-mutilation",
    "automutilation",
    "суицид",
    "самоубийств",
    "покончить с собой",
    "хочу умереть",
    "навредить себе",
)

# Try to get git SHA from environment (set during build)
GIT_SHA = os.getenv("GIT_SHA", "unknown")
IMAGE_TAG = os.getenv("IMAGE_TAG", "unknown")


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: user, assistant, or system")
    content: str = Field(..., description="Message content")


class ChatCompletionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    model: Optional[str] = Field(None, description="Model name (optional, uses default)")
    messages: List[ChatMessage] = Field(..., description="List of chat messages")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(1000, ge=1, description="Maximum tokens to generate")
    stream: Optional[bool] = Field(False, description="Whether to stream the response")
    top_p: Optional[float] = Field(0.9, ge=0.0, le=1.0, description="Nucleus sampling parameter")
    frequency_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0, description="Frequency penalty")
    presence_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0, description="Presence penalty")
    session_id: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("sessionId", "session_id"),
        description="Opaque session id for optional Redis metadata (from API gateway)",
    )


def detect_crisis_signals(text: str) -> bool:
    if not text or not text.strip():
        return False
    lowered = text.lower()
    return any(kw in lowered for kw in CRISIS_KEYWORDS)


def user_messages_text(messages: List[ChatMessage]) -> str:
    return "\n".join(m.content for m in messages if m.role == "user")


def prepare_messages_with_system(messages: List[ChatMessage]) -> List[ChatMessage]:
    """Ensure DEFAULT_SYSTEM_PROMPT is applied (merged with any client system message)."""
    if not messages:
        return [ChatMessage(role="system", content=DEFAULT_SYSTEM_PROMPT)]
    out: List[ChatMessage] = []
    merged = False
    for msg in messages:
        if msg.role == "system" and not merged:
            merged = True
            combined = f"{DEFAULT_SYSTEM_PROMPT}\n\n---\n\n{msg.content}"
            out.append(ChatMessage(role="system", content=combined))
        else:
            out.append(msg)
    if not merged:
        out.insert(0, ChatMessage(role="system", content=DEFAULT_SYSTEM_PROMPT))
    return out


def initialize_model():
    """Initialize vLLM (GPU), Hugging Face on CPU, explicit mock, or proxy-only (external OpenAI server)."""
    if VLLM_OPENAI_BASE_URL:
        display = os.getenv("PROXY_MODEL_DISPLAY_NAME", MODEL_NAME).strip() or MODEL_NAME
        logger.info(
            "Inference mode=proxy: requests forwarded to OpenAI-compatible upstream %s (model display=%s)",
            VLLM_OPENAI_BASE_URL,
            display,
        )
        app_state["model_loaded"] = True
        app_state["model_name"] = display
        app_state["model_revision"] = MODEL_REVISION
        app_state["inference_backend"] = "proxy"
        app_state["llm_engine"] = None
        app_state["tokenizer"] = None
        app_state["hf_model"] = None
        return

    if app_state["use_gpu"]:
        try:
            from vllm import LLM
            from transformers import AutoTokenizer

            logger.info(f"Initializing vLLM with model: {MODEL_NAME}")
            vllm_kwargs: Dict[str, Any] = {
                "model": MODEL_NAME,
                "trust_remote_code": True,
                "max_model_len": MAX_MODEL_LEN,
                "revision": MODEL_REVISION,
                "max_num_seqs": VLLM_MAX_NUM_SEQS,
            }
            if GPU_MEMORY_UTILIZATION:
                vllm_kwargs["gpu_memory_utilization"] = GPU_MEMORY_UTILIZATION
            if VLLM_TENSOR_PARALLEL_SIZE and VLLM_TENSOR_PARALLEL_SIZE > 1:
                vllm_kwargs["tensor_parallel_size"] = VLLM_TENSOR_PARALLEL_SIZE
            if VLLM_ENABLE_CHUNKED_PREFILL:
                vllm_kwargs["enable_chunked_prefill"] = True
            if VLLM_TOKENIZER_MODE:
                vllm_kwargs["tokenizer_mode"] = VLLM_TOKENIZER_MODE

            app_state["llm_engine"] = LLM(**vllm_kwargs)
            # Load tokenizer separately so vLLM and CPU paths share one canonical chat template.
            tok = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True, revision=MODEL_REVISION)
            if tok.pad_token is None:
                tok.pad_token = tok.eos_token
            app_state["tokenizer"] = tok
            app_state["model_loaded"] = True
            app_state["model_name"] = MODEL_NAME
            app_state["model_revision"] = MODEL_REVISION
            app_state["inference_backend"] = "vllm"
            logger.info(f"Model {MODEL_NAME} loaded successfully (vLLM)")
        except ImportError:
            logger.error("vLLM not installed. Install with: pip install vllm")
            app_state["model_loaded"] = False
            app_state["inference_backend"] = None
        except Exception as e:
            logger.error(f"Failed to load GPU model: {e}", exc_info=True)
            app_state["model_loaded"] = False
            app_state["inference_backend"] = None
        return

    if USE_MOCK_RESPONSES:
        logger.info("USE_MOCK_RESPONSES=true: mock replies only (no LLM)")
        app_state["model_loaded"] = True
        app_state["model_name"] = "mock-model"
        app_state["model_revision"] = "mock"
        app_state["inference_backend"] = "mock"
        return

    logger.info(f"USE_GPU=false: loading CPU model {CPU_MODEL_NAME}")
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        tok = AutoTokenizer.from_pretrained(CPU_MODEL_NAME, trust_remote_code=True)
        if tok.pad_token is None:
            tok.pad_token = tok.eos_token
        model = AutoModelForCausalLM.from_pretrained(
            CPU_MODEL_NAME,
            trust_remote_code=True,
            torch_dtype=torch.float32,
            device_map="cpu",
            low_cpu_mem_usage=True,
        )
        model.eval()
        app_state["tokenizer"] = tok
        app_state["hf_model"] = model
        app_state["model_loaded"] = True
        app_state["model_name"] = CPU_MODEL_NAME
        app_state["model_revision"] = MODEL_REVISION
        app_state["inference_backend"] = "cpu"
        logger.info(f"CPU model {CPU_MODEL_NAME} loaded")
    except Exception as e:
        logger.error(f"Failed to load CPU model: {e}", exc_info=True)
        app_state["model_loaded"] = False
        app_state["inference_backend"] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    logger.info("Starting AI Chatbot Service...")
    logger.info(f"USE_GPU={app_state['use_gpu']}")
    logger.info(f"USE_MOCK_RESPONSES={USE_MOCK_RESPONSES}")
    logger.info(f"MODEL_NAME={MODEL_NAME} CPU_MODEL_NAME={CPU_MODEL_NAME}")
    logger.info(f"inference_backend={app_state.get('inference_backend')}")

    def _init_safe() -> None:
        try:
            initialize_model()
        except Exception as e:
            logger.error("Model initialization failed: %s", e, exc_info=True)
            app_state["model_loaded"] = False

    # Heavy model load runs off the event loop so /health stays reachable (deploy probes, LB checks).
    init_task = asyncio.create_task(asyncio.to_thread(_init_safe))

    def _log_init_task(t: asyncio.Task) -> None:
        if t.cancelled():
            return
        exc = t.exception()
        if exc is not None:
            logger.error("Background model init task failed: %s", exc)

    init_task.add_done_callback(_log_init_task)
    try:
        yield
    finally:
        init_task.cancel()
        try:
            await init_task
        except asyncio.CancelledError:
            pass
        logger.info("Shutting down AI Chatbot Service...")


app = FastAPI(
    title="AI Chatbot Service",
    description="OpenAI-compatible vLLM-based chat completion API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def verify_api_key(
    authorization: Optional[str] = Header(None)
):
    """Verify API key for protected endpoints"""
    # Skip auth if key is not configured (for backward compatibility)
    if not AI_INTERNAL_API_KEY:
        return True  # No auth required if key not configured
    
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    if token != AI_INTERNAL_API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key"
        )
    
    return True


@app.get("/health")
async def health():
    """Alias for load balancers / deploy scripts expecting /health."""
    return await healthz()


@app.get("/healthz")
async def healthz():
    """Health check endpoint - must be fast and stable (public endpoint)"""
    uptime = time.time() - app_state["start_time"]
    
    status = "ok" if app_state["model_loaded"] else "degraded"
    
    return JSONResponse({
        "status": status,
        "model_loaded": app_state["model_loaded"],
        # Alias for deploy probes / scripts that grep `model_ready`
        "model_ready": app_state["model_loaded"],
        "model_name": app_state["model_name"],
        "uptime": int(uptime),  # Production-ready format
        "uptime_seconds": int(uptime),  # Keep for backward compatibility
        "use_gpu": app_state["use_gpu"],
        "inference_backend": app_state["inference_backend"],
        "use_mock_responses": USE_MOCK_RESPONSES,
        "redis": redis_health(),
    })


@app.get("/version")
async def version():
    """Version endpoint with git SHA and image tag"""
    return JSONResponse({
        "git_sha": GIT_SHA,
        "image_tag": IMAGE_TAG,
        "model_name": app_state["model_name"],
        "model_revision": app_state["model_revision"],
        "service_version": "1.0.0",
    })


def generate_mock_response(messages: List[ChatMessage], stream: bool = False, crisis_detected: bool = False):
    """Generate a mock response for non-GPU mode"""
    response_text = "This is a mock response. GPU mode is disabled (USE_GPU=false)."
    if crisis_detected:
        response_text = CRISIS_PREPEND + response_text
    
    if stream:
        def mock_stream():
            # Simulate token-by-token streaming
            tokens = response_text.split()
            for i, token in enumerate(tokens):
                chunk = {
                    "id": f"mock-{int(time.time())}",
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": "mock-model",
                    "choices": [{
                        "index": 0,
                        "delta": {"content": token + " "},
                        "finish_reason": None
                    }]
                }
                yield f"data: {json.dumps(chunk)}\n\n"
            
            # Final chunk
            final_chunk = {
                "id": f"mock-{int(time.time())}",
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": "mock-model",
                "choices": [{
                    "index": 0,
                    "delta": {},
                    "finish_reason": "stop"
                }]
            }
            yield f"data: {json.dumps(final_chunk)}\n\n"
            yield "data: [DONE]\n\n"
        
        return mock_stream()
    else:
        return {
            "id": f"mock-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": "mock-model",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": sum(len(msg.content.split()) for msg in messages),
                "completion_tokens": len(response_text.split()),
                "total_tokens": sum(len(msg.content.split()) for msg in messages) + len(response_text.split())
            }
        }


def _hf_chat_prompt(messages: List[ChatMessage]) -> str:
    tok = app_state["tokenizer"]
    if not tok:
        raise HTTPException(status_code=503, detail="Tokenizer not loaded")
    return build_prompt_with_tokenizer(tokenizer=tok, messages=messages).prompt


def generate_cpu_stream(
    messages: List[ChatMessage],
    temperature: float,
    max_tokens: int,
    model: str,
    top_p: float,
    prepend_crisis: bool = False,
):
    """HF causal LM streaming (CPU)."""
    from threading import Thread
    from transformers import TextIteratorStreamer

    tokenizer = app_state["tokenizer"]
    hf_model = app_state["hf_model"]
    if not tokenizer or not hf_model:
        raise HTTPException(status_code=503, detail="CPU model not loaded")

    prompt = _hf_chat_prompt(messages)
    inputs = tokenizer(prompt, return_tensors="pt")
    inputs = {k: v.to(hf_model.device) for k, v in inputs.items()}

    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    gen_kwargs = {
        **inputs,
        "streamer": streamer,
        "max_new_tokens": max_tokens,
        "do_sample": True,
        "temperature": max(0.01, float(temperature)),
        "top_p": float(top_p),
    }

    thread = Thread(target=hf_model.generate, kwargs=gen_kwargs)
    thread.start()

    completion_id = f"chatcmpl-{int(time.time())}"
    created_time = int(time.time())
    mid = model or app_state["model_name"]

    if prepend_crisis:
        chunk = {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created_time,
            "model": mid,
            "choices": [{"index": 0, "delta": {"content": CRISIS_PREPEND}, "finish_reason": None}],
        }
        yield f"data: {json.dumps(chunk)}\n\n"

    for new_text in streamer:
        if not new_text:
            continue
        chunk = {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created_time,
            "model": mid,
            "choices": [{"index": 0, "delta": {"content": new_text}, "finish_reason": None}],
        }
        yield f"data: {json.dumps(chunk)}\n\n"

    thread.join()
    final_chunk = {
        "id": completion_id,
        "object": "chat.completion.chunk",
        "created": created_time,
        "model": mid,
        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
    }
    yield f"data: {json.dumps(final_chunk)}\n\n"
    yield "data: [DONE]\n\n"


async def generate_cpu_non_stream(
    messages: List[ChatMessage],
    temperature: float,
    max_tokens: int,
    model: str,
    top_p: float,
    prepend_crisis: bool = False,
) -> Dict[str, Any]:
    import torch

    tokenizer = app_state["tokenizer"]
    hf_model = app_state["hf_model"]
    if not tokenizer or not hf_model:
        raise HTTPException(status_code=503, detail="CPU model not loaded")

    prompt = _hf_chat_prompt(messages)
    inputs = tokenizer(prompt, return_tensors="pt")
    inputs = {k: v.to(hf_model.device) for k, v in inputs.items()}

    def _gen() -> str:
        with torch.inference_mode():
            out = hf_model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                do_sample=True,
                temperature=max(0.01, float(temperature)),
                top_p=float(top_p),
            )
        row = out[0]
        prompt_len = inputs["input_ids"].shape[1]
        gen_tokens = row[prompt_len:]
        return tokenizer.decode(gen_tokens, skip_special_tokens=True)

    generated_text = await run_in_threadpool(_gen)
    if prepend_crisis:
        generated_text = CRISIS_PREPEND + generated_text

    completion_id = f"chatcmpl-{int(time.time())}"
    mid = model or app_state["model_name"]
    prompt_tokens = inputs["input_ids"].shape[1]
    completion_tokens = len(generated_text.split())
    return {
        "id": completion_id,
        "object": "chat.completion",
        "created": int(time.time()),
        "model": mid,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": generated_text},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": int(prompt_tokens),
            "completion_tokens": completion_tokens,
            "total_tokens": int(prompt_tokens) + completion_tokens,
        },
    }


def generate_vllm_stream(
    messages: List[ChatMessage],
    temperature: float,
    max_tokens: int,
    model: str,
    top_p: float,
    prepend_crisis: bool = False,
):
    """Generate streaming response using vLLM"""
    if not app_state["llm_engine"]:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    from vllm import SamplingParams

    tok = app_state["tokenizer"]
    if not tok:
        raise HTTPException(status_code=503, detail="Tokenizer not loaded")
    prompt = build_prompt_with_tokenizer(tokenizer=tok, messages=messages).prompt
    
    # Create sampling params
    sampling_params = SamplingParams(
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    
    # Generate with streaming
    request_id = f"req-{int(time.time())}"
    completion_id = f"chatcmpl-{int(time.time())}"
    created_time = int(time.time())
    
    try:
        if prepend_crisis:
            chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created_time,
                "model": model or app_state["model_name"],
                "choices": [{
                    "index": 0,
                    "delta": {"content": CRISIS_PREPEND},
                    "finish_reason": None
                }]
            }
            yield f"data: {json.dumps(chunk)}\n\n"

        # vLLM's LLM.generate() returns a list of RequestOutput
        # For streaming, we use the generate() method which yields tokens
        # We'll use a synchronous generator that yields SSE chunks
        
        # Use vLLM's streaming generation
        # Note: vLLM's LLM class doesn't have native async streaming in all versions
        # We'll use the synchronous generate and yield tokens incrementally
        outputs = app_state["llm_engine"].generate([prompt], sampling_params, request_id=request_id)
        
        if not outputs or len(outputs) == 0:
            raise HTTPException(status_code=500, detail="No output generated")
        
        output = outputs[0]
        gen = output.outputs[0]
        token_ids = getattr(gen, "token_ids", None)
        if token_ids is None:
            token_ids = getattr(gen, "tokens", None)

        mid = model or app_state["model_name"]

        if token_ids and len(token_ids) > 0:
            prev_text = ""
            for i in range(1, len(token_ids) + 1):
                cur = tok.decode(token_ids[:i], skip_special_tokens=True)
                delta_text = cur[len(prev_text) :]
                prev_text = cur
                if not delta_text:
                    continue
                chunk = {
                    "id": completion_id,
                    "object": "chat.completion.chunk",
                    "created": created_time,
                    "model": mid,
                    "choices": [{
                        "index": 0,
                        "delta": {"content": delta_text},
                        "finish_reason": None
                    }]
                }
                yield f"data: {json.dumps(chunk)}\n\n"
        else:
            generated_text = gen.text
            tokens = generated_text.split()
            previous_text = ""
            for i, token in enumerate(tokens):
                current_text = previous_text + (" " if previous_text else "") + token
                delta_text = token + (" " if i < len(tokens) - 1 else "")
                chunk = {
                    "id": completion_id,
                    "object": "chat.completion.chunk",
                    "created": created_time,
                    "model": mid,
                    "choices": [{
                        "index": 0,
                        "delta": {"content": delta_text},
                        "finish_reason": None
                    }]
                }
                yield f"data: {json.dumps(chunk)}\n\n"
                previous_text = current_text
        
        # Final chunk
        final_chunk = {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created_time,
            "model": mid,
            "choices": [{
                "index": 0,
                "delta": {},
                "finish_reason": "stop"
            }]
        }
        yield f"data: {json.dumps(final_chunk)}\n\n"
        yield "data: [DONE]\n\n"
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"vLLM generation error: {e}", exc_info=True)
        error_chunk = {
            "id": completion_id,
            "object": "error",
            "error": {
                "message": str(e),
                "type": "generation_error"
            }
        }
        yield f"data: {json.dumps(error_chunk)}\n\n"


async def generate_vllm_non_stream(
    messages: List[ChatMessage],
    temperature: float,
    max_tokens: int,
    model: str,
    top_p: float,
    prepend_crisis: bool = False,
) -> Dict[str, Any]:
    """Generate non-streaming response using vLLM"""
    if not app_state["llm_engine"]:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    from vllm import SamplingParams

    tok = app_state["tokenizer"]
    if not tok:
        raise HTTPException(status_code=503, detail="Tokenizer not loaded")
    prompt = build_prompt_with_tokenizer(tokenizer=tok, messages=messages).prompt
    
    # Create sampling params
    sampling_params = SamplingParams(
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    
    # Generate
    request_id = f"req-{int(time.time())}"
    completion_id = f"chatcmpl-{int(time.time())}"
    
    try:
        outputs = app_state["llm_engine"].generate([prompt], sampling_params, request_id=request_id)
        
        if not outputs or not outputs[0].outputs:
            raise HTTPException(status_code=500, detail="No output generated")
        
        output = outputs[0]
        generated_text = output.outputs[0].text
        if prepend_crisis:
            generated_text = CRISIS_PREPEND + generated_text
        
        # Estimate token counts (rough: ~4 chars per token)
        prompt_tokens = len(prompt) // 4
        completion_tokens = len(generated_text) // 4
        
        return {
            "id": completion_id,
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model or app_state["model_name"],
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": generated_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens
            }
        }
    except Exception as e:
        logger.error(f"vLLM generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


def _upstream_openai_headers() -> Dict[str, str]:
    h = {"Content-Type": "application/json"}
    if UPSTREAM_OPENAI_API_KEY:
        h["Authorization"] = f"Bearer {UPSTREAM_OPENAI_API_KEY}"
    return h


def _openai_messages_dicts(messages: List[ChatMessage]) -> List[Dict[str, str]]:
    return [{"role": m.role, "content": m.content} for m in messages]


def _crisis_sse_chunk_bytes(model_id: str) -> bytes:
    cid = f"chatcmpl-{int(time.time())}"
    created = int(time.time())
    chunk = {
        "id": cid,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model_id,
        "choices": [{"index": 0, "delta": {"content": CRISIS_PREPEND}, "finish_reason": None}],
    }
    return f"data: {json.dumps(chunk)}\n\n".encode("utf-8")


async def proxy_upstream_chat_stream(
    messages: List[ChatMessage],
    model: str,
    temperature: float,
    max_tokens: int,
    top_p: float,
    frequency_penalty: float,
    presence_penalty: float,
    prepend_crisis: bool,
):
    """Byte-streaming passthrough to upstream OpenAI-compatible /v1/chat/completions (true SSE)."""
    url = f"{VLLM_OPENAI_BASE_URL}/v1/chat/completions"
    body: Dict[str, Any] = {
        "model": model,
        "messages": _openai_messages_dicts(messages),
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
        "top_p": top_p,
        "frequency_penalty": frequency_penalty,
        "presence_penalty": presence_penalty,
    }
    timeout = httpx.Timeout(UPSTREAM_OPENAI_TIMEOUT_S)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", url, json=body, headers=_upstream_openai_headers()) as resp:
            if resp.status_code >= 400:
                detail = (await resp.aread())[:800].decode("utf-8", errors="replace")
                raise HTTPException(status_code=502, detail=f"Upstream {resp.status_code}: {detail}")
            if prepend_crisis:
                yield _crisis_sse_chunk_bytes(model)
            async for chunk in resp.aiter_bytes():
                yield chunk


async def proxy_upstream_chat_json(
    messages: List[ChatMessage],
    model: str,
    temperature: float,
    max_tokens: int,
    top_p: float,
    frequency_penalty: float,
    presence_penalty: float,
    prepend_crisis: bool,
) -> JSONResponse:
    url = f"{VLLM_OPENAI_BASE_URL}/v1/chat/completions"
    body: Dict[str, Any] = {
        "model": model,
        "messages": _openai_messages_dicts(messages),
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
        "top_p": top_p,
        "frequency_penalty": frequency_penalty,
        "presence_penalty": presence_penalty,
    }
    timeout = httpx.Timeout(UPSTREAM_OPENAI_TIMEOUT_S)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, json=body, headers=_upstream_openai_headers())
        if r.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"Upstream {r.status_code}: {r.text[:800]}",
            )
        data = r.json()
        if prepend_crisis and isinstance(data, dict):
            choices = data.get("choices")
            if isinstance(choices, list) and choices:
                msg = choices[0].get("message") if isinstance(choices[0], dict) else None
                if isinstance(msg, dict) and "content" in msg:
                    msg["content"] = CRISIS_PREPEND + (msg.get("content") or "")
        return JSONResponse(data)


@app.get("/v1/models")
async def list_models():
    """OpenAI-compatible model list (used by app proxy health checks)."""
    if app_state["inference_backend"] == "proxy" and VLLM_OPENAI_BASE_URL:
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
                r = await client.get(
                    f"{VLLM_OPENAI_BASE_URL}/v1/models",
                    headers=_upstream_openai_headers(),
                )
                if r.status_code == 200:
                    return r.json()
        except Exception as e:
            logger.warning("proxy /v1/models upstream failed: %s", e)
    mid = app_state["model_name"] or MODEL_NAME
    return {
        "object": "list",
        "data": [{"id": mid, "object": "model", "created": int(time.time()), "owned_by": "safepsy"}],
    }


@app.post("/v1/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    _: bool = Depends(verify_api_key)
):
    """OpenAI-compatible chat completions endpoint with SSE streaming support"""
    
    if not app_state["model_loaded"]:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Service is starting up or model failed to load.",
        )

    # Use request model or default
    model = request.model or app_state["model_name"] or MODEL_NAME

    crisis_detected = detect_crisis_signals(user_messages_text(request.messages))
    messages = prepare_messages_with_system(request.messages)
    touch_session(request.session_id, len(request.messages))
    temperature = 0.7 if request.temperature is None else request.temperature
    top_p = 0.9 if request.top_p is None else request.top_p
    max_tokens = request.max_tokens or 1000
    frequency_penalty = 0.0 if request.frequency_penalty is None else request.frequency_penalty
    presence_penalty = 0.0 if request.presence_penalty is None else request.presence_penalty

    if app_state["inference_backend"] == "proxy":
        try:
            if request.stream:
                return StreamingResponse(
                    proxy_upstream_chat_stream(
                        messages,
                        model,
                        temperature,
                        max_tokens,
                        top_p,
                        frequency_penalty,
                        presence_penalty,
                        crisis_detected,
                    ),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    },
                )
            return await proxy_upstream_chat_json(
                messages,
                model,
                temperature,
                max_tokens,
                top_p,
                frequency_penalty,
                presence_penalty,
                crisis_detected,
            )
        except HTTPException:
            raise
        except httpx.HTTPError as e:
            logger.error("Proxy upstream error: %s", e, exc_info=True)
            raise HTTPException(status_code=502, detail=f"Upstream unreachable: {e!s}") from e

    if app_state["inference_backend"] == "mock":
        if request.stream:
            return StreamingResponse(
                generate_mock_response(messages, stream=True, crisis_detected=crisis_detected),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            )
        return JSONResponse(generate_mock_response(messages, stream=False, crisis_detected=crisis_detected))

    if app_state["inference_backend"] == "cpu":
        try:
            if request.stream:
                return StreamingResponse(
                    generate_cpu_stream(
                        messages,
                        temperature,
                        max_tokens,
                        model,
                        top_p,
                        prepend_crisis=crisis_detected,
                    ),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    },
                )
            result = await generate_cpu_non_stream(
                messages,
                temperature,
                max_tokens,
                model,
                top_p,
                prepend_crisis=crisis_detected,
            )
            return JSONResponse(result)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"CPU chat completion error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    # vLLM (GPU)
    try:
        if request.stream:
            # Use a generator function for streaming
            def stream_generator():
                for chunk in generate_vllm_stream(
                    messages,
                    temperature,
                    max_tokens,
                    model,
                    top_p,
                    prepend_crisis=crisis_detected,
                ):
                    yield chunk
            
            return StreamingResponse(
                stream_generator(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            result = await generate_vllm_non_stream(
                messages,
                temperature,
                max_tokens,
                model,
                top_p,
                prepend_crisis=crisis_detected,
            )
            return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat completion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/chat")
async def chat_alias(
    request: ChatCompletionRequest,
    _: bool = Depends(verify_api_key),
):
    """Same as /v1/chat/completions — for backends that call POST /chat."""
    return await chat_completions(request, _)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AI Chatbot Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "healthz": "/healthz",
            "version": "/version",
            "chat": "/chat",
            "openai_chat": "/v1/chat/completions"
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )

