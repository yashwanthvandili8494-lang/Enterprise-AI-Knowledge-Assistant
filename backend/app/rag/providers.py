import hashlib
import json
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import numpy as np
from app.core.config import settings

logger = logging.getLogger("enterprise_ai.rag")


class BaseEmbeddingProvider(ABC):
    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Generates embedding vector for a single string."""
        pass

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generates embeddings for a batch of strings."""
        pass


class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate_answer(self, prompt: str, system_prompt: str = "") -> str:
        """Generates a text completion based on prompt and system constraints."""
        pass


# ==========================================
# Deterministic Mock Provider (Tests & Offline)
# ==========================================
class MockEmbeddingProvider(BaseEmbeddingProvider):
    """
    Generates deterministic pseudo-semantic vectors based on token hashes.
    Ensures consistent cosine similarity in test and offline environments.
    """
    def __init__(self, dim: int = settings.EMBEDDING_DIMENSIONS):
        self.dim = dim

    def _hash_to_vector(self, text: str) -> List[float]:
        vec = np.zeros(self.dim, dtype=np.float32)
        words = text.lower().split()
        if not words:
            vec[0] = 1.0
            return vec.tolist()

        for word in words:
            # Deterministic hash index
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dim
            vec[idx] += 1.0

        # L2 Normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    async def embed_text(self, text: str) -> List[float]:
        return self._hash_to_vector(text)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_to_vector(t) for t in texts]


class MockLLMProvider(BaseLLMProvider):
    """
    Simulates grounded LLM generation strictly respecting the provided evidence.
    """
    async def generate_answer(self, prompt: str, system_prompt: str = "") -> str:
        # Check if context was provided in prompt
        if "Context:" in prompt or "CONTEXT:" in prompt:
            context_part = prompt.split("Context:")[1] if "Context:" in prompt else prompt.split("CONTEXT:")[1]
            question_part = prompt.split("Question:")[1].split("Context:")[0] if "Question:" in prompt else prompt
        else:
            context_part = ""
            question_part = prompt

        clean_context = context_part.strip()
        
        # If no context or empty
        if not clean_context or clean_context == "No relevant documents found.":
            return "I could not find the answer in the available sources."

        # Extract keywords from question
        q_words = [w.lower().strip("?,.") for w in question_part.split() if len(w) > 3]
        matches = [w for w in q_words if w in clean_context.lower()]

        if not matches:
            return "I could not find the answer in the available sources."

        # Extract the most relevant sentences
        sentences = [s.strip() for s in clean_context.split("\n") if s.strip()]
        relevant_sentences = []
        for s in sentences:
            if any(m in s.lower() for m in matches):
                relevant_sentences.append(s)

        if not relevant_sentences:
            relevant_sentences = sentences[:3]

        answer_summary = " ".join(relevant_sentences[:2])
        return (
            f"Based on the enterprise documents provided, {answer_summary}\n\n"
            f"Please refer to the source citations below for full verification."
        )


# ==========================================
# Google Gemini Provider
# ==========================================
class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self, api_key: str = settings.GEMINI_API_KEY, model: str = settings.EMBEDDING_MODEL):
        self.api_key = api_key
        self.model = model
        self.fallback = MockEmbeddingProvider()

    async def embed_text(self, text: str) -> List[float]:
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set. Falling back to deterministic mock embedding.")
            return await self.fallback.embed_text(text)
        try:
            import httpx
            # Call Google GenAI Embeddings REST API
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:embedContent?key={self.api_key}"
            payload = {
                "model": f"models/{self.model}",
                "content": {"parts": [{"text": text[:2048]}]}
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["embedding"]["values"]
                logger.error(f"Gemini API embedding error {res.status_code}: {res.text}")
                return await self.fallback.embed_text(text)
        except Exception as e:
            logger.error(f"Gemini embedding exception: {e}")
            return await self.fallback.embed_text(text)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        results = []
        for t in texts:
            vec = await self.embed_text(t)
            results.append(vec)
        return results


class GeminiLLMProvider(BaseLLMProvider):
    def __init__(self, api_key: str = settings.GEMINI_API_KEY, model: str = settings.LLM_MODEL):
        self.api_key = api_key
        self.model = model
        self.fallback = MockLLMProvider()

    async def generate_answer(self, prompt: str, system_prompt: str = "") -> str:
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set. Falling back to deterministic mock LLM response.")
            return await self.fallback.generate_answer(prompt, system_prompt)
        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,  # Grounded factual answers
                    "maxOutputTokens": 1024,
                }
            }
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts:
                            return parts[0].get("text", "")
                logger.error(f"Gemini API error {res.status_code}: {res.text}")
                return await self.fallback.generate_answer(prompt, system_prompt)
        except Exception as e:
            logger.error(f"Gemini LLM generation exception: {e}")
            return await self.fallback.generate_answer(prompt, system_prompt)


# ==========================================
# Provider Factory
# ==========================================
def get_embedding_provider() -> BaseEmbeddingProvider:
    provider = settings.AI_PROVIDER.lower()
    if provider == "gemini" and settings.GEMINI_API_KEY:
        return GeminiEmbeddingProvider()
    return MockEmbeddingProvider()


def get_llm_provider() -> BaseLLMProvider:
    provider = settings.AI_PROVIDER.lower()
    if provider == "gemini" and settings.GEMINI_API_KEY:
        return GeminiLLMProvider()
    return MockLLMProvider()
