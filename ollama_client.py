"""
ollama_client.py
----------------
Lightweight HTTP client for local Ollama instance.
Connects to: http://localhost:11434/api/chat

Defaults to qwen3:4b, configurable via OLLAMA_MODEL environment variable.
Handles connection failures, timeouts, and missing models gracefully.
"""

import os
import re
import requests

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3:4b")
DEFAULT_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "60"))


def check_ollama(host: str = OLLAMA_HOST) -> bool:
    """Check if the Ollama service is reachable."""
    try:
        resp = requests.get(f"{host}/api/tags", timeout=5)
        return resp.status_code == 200
    except Exception:
        return False


def list_models(host: str = OLLAMA_HOST) -> list:
    """Return a list of available model names."""
    try:
        resp = requests.get(f"{host}/api/tags", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            return [m.get("name") for m in data.get("models", [])]
        return []
    except Exception:
        return []


def is_model_available(model: str = DEFAULT_MODEL, host: str = OLLAMA_HOST) -> bool:
    """Check if a specific model is loaded in Ollama."""
    models = list_models(host)
    model_base = model.split(":")[0].lower()
    for m in models:
        m_lower = m.lower()
        if m_lower == model.lower() or m_lower.startswith(model_base):
            return True
    return False


def verify_ollama_setup(host: str = OLLAMA_HOST, model: str = DEFAULT_MODEL, verbose: bool = True) -> tuple[bool, str]:
    """
    Perform three-point health check required by Stage 4:
      1. Ollama connected (GET /api/tags)
      2. Model available
      3. Qwen response verified (test request for QWEN_OK)
    """
    # 1. Connection check
    if not check_ollama(host):
        err = f"Cannot connect to Ollama at {host}. Is Ollama service running?"
        if verbose:
            print(f"[FAIL] {err}")
        return False, err
    if verbose:
        print("[OK] Ollama connected")

    # 2. Model check
    if not is_model_available(model, host):
        err = f"Model '{model}' not found in Ollama. Available: {list_models(host)}"
        if verbose:
            print(f"[FAIL] {err}")
        return False, err
    if verbose:
        print(f"[OK] {model} available")

    # 3. Test prompt for QWEN_OK
    test_payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a video understanding assistant."},
            {"role": "user", "content": "Reply exactly with QWEN_OK"}
        ],
        "stream": False
    }

    try:
        resp = requests.post(f"{host}/api/chat", json=test_payload, timeout=20)
        if resp.status_code != 200:
            err = f"Ollama HTTP {resp.status_code}: {resp.text}"
            if verbose:
                print(f"[FAIL] {err}")
            return False, err

        data = resp.json()
        content = data.get("message", {}) .get("content", "").strip()
        thinking = data.get("message", {}).get("thinking", "")
        combined = content or thinking

        if "QWEN_OK" in combined:
            if verbose:
                print("[OK] Qwen response received")
            return True, ""
        else:
            err = f"Expected 'QWEN_OK', got: '{content}'"
            if verbose:
                print(f"[FAIL] {err}")
            return False, err

    except Exception as e:
        err = f"Test request failed: {e}"
        if verbose:
            print(f"[FAIL] {err}")
        return False, err


def _clean_response_text(text: str) -> str:
    """Remove thinking tags and formatting artifacts."""
    if not text:
        return ""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    return text.strip()


def generate(prompt: str,
             system_prompt: str = "",
             model: str = None,
             host: str = OLLAMA_HOST,
             timeout: int = DEFAULT_TIMEOUT) -> dict:
    """
    Send chat request to Ollama /api/chat.

    Returns dict:
      {
        "success": bool,
        "content": str,
        "model": str,
        "error": str | None
      }
    """
    target_model = model or DEFAULT_MODEL

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": target_model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.0,
        }
    }

    try:
        url = f"{host}/api/chat"
        resp = requests.post(url, json=payload, timeout=timeout)

        if resp.status_code != 200:
            return {
                "success": False,
                "content": "",
                "model": target_model,
                "error": f"Ollama HTTP {resp.status_code}: {resp.text}"
            }

        data = resp.json()
        message = data.get("message", {})
        content = message.get("content", "")
        cleaned_content = _clean_response_text(content)

        # If thinking model placed entire final thought in thinking and left content blank
        if not cleaned_content and message.get("thinking"):
            thinking_text = message["thinking"].strip()
            # Look for final conclusion line in thinking
            last_lines = [l.strip() for l in thinking_text.splitlines() if l.strip()]
            if last_lines:
                cleaned_content = last_lines[-1]

        return {
            "success": True,
            "content": cleaned_content,
            "model": data.get("model", target_model),
            "error": None
        }

    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "content": "",
            "model": target_model,
            "error": f"Could not connect to Ollama at {host}. Is Ollama running?"
        }
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "content": "",
            "model": target_model,
            "error": f"Ollama request timed out after {timeout} seconds."
        }
    except Exception as e:
        return {
            "success": False,
            "content": "",
            "model": target_model,
            "error": f"Ollama error: {str(e)}"
        }


if __name__ == "__main__":
    ok, err = verify_ollama_setup()
    print(f"Ollama Setup Valid: {ok}")
