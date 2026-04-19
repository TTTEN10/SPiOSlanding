from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional


@dataclass(frozen=True)
class PromptBuildResult:
    prompt: str
    template: str


def _to_chat_template_messages(messages: Iterable[Any]) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for m in messages:
        role = getattr(m, "role", None) if not isinstance(m, dict) else m.get("role")
        content = getattr(m, "content", None) if not isinstance(m, dict) else m.get("content")
        if not role or not content:
            continue
        out.append({"role": str(role), "content": str(content)})
    return out


def build_prompt_with_tokenizer(
    *,
    tokenizer: Any,
    messages: Iterable[Any],
    add_generation_prompt: bool = True,
) -> PromptBuildResult:
    """
    Canonical prompt builder for both CPU (HF) and local vLLM (LLM.generate) paths.

    Strategy:
    - Use the tokenizer's `apply_chat_template()` so the prompt matches the model's expected chat formatting.
    - This is required for consistent behavior across backends and especially important for Mistral-class models.
    """
    raw = _to_chat_template_messages(messages)
    prompt = tokenizer.apply_chat_template(
        raw,
        tokenize=False,
        add_generation_prompt=add_generation_prompt,
    )
    return PromptBuildResult(prompt=prompt, template="hf_apply_chat_template")

