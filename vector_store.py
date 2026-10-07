"""
vector_store.py
---------------
Lightweight local vector store for semantic event retrieval.

Embedding backend (in priority order):
  1. sentence-transformers  all-MiniLM-L6-v2  (22 MB, fast)
  2. TF-IDF keyword fallback (no dependencies)

Index backend (in priority order):
  1. FAISS (if installed)
  2. NumPy cosine similarity (always available)

No Docker, no Qdrant, no cloud APIs.
Runs entirely on local CPU/GPU.
"""

import json
import os
import pickle
import numpy as np
from event_documents import load_documents

CLEAN_FILE  = "outputs/events_clean.json"
INDEX_FILE  = "outputs/vector_index.pkl"
MODEL_NAME  = "all-MiniLM-L6-v2"


# =============================================================================
# EMBEDDING BACKENDS
# =============================================================================

class SentenceTransformerEmbedder:
    def __init__(self, model_name: str = MODEL_NAME):
        from sentence_transformers import SentenceTransformer
        print(f"  Loading embedding model: {model_name} ...")
        self.model = SentenceTransformer(model_name)
        print("  Model loaded.")

    def encode(self, texts: list) -> np.ndarray:
        vecs = self.model.encode(texts, convert_to_numpy=True,
                                 show_progress_bar=False)
        # L2 normalise
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)
        return vecs / norms

    def name(self) -> str:
        return f"sentence-transformers/{MODEL_NAME}"


class TFIDFEmbedder:
    """Keyword-based fallback using simple TF-IDF bag-of-words."""
    def __init__(self):
        self._vocab = {}
        self._fitted = False
        print("  Using TF-IDF keyword fallback embedder.")

    def _tokenize(self, text: str) -> list:
        import re
        return re.findall(r"[a-z0-9]+", text.lower())

    def _fit(self, texts: list):
        vocab_set = set()
        for t in texts:
            vocab_set.update(self._tokenize(t))
        self._vocab = {w: i for i, w in enumerate(sorted(vocab_set))}
        self._fitted = True

    def _vectorize(self, text: str) -> np.ndarray:
        vec = np.zeros(len(self._vocab), dtype=np.float32)
        for token in self._tokenize(text):
            if token in self._vocab:
                vec[self._vocab[token]] += 1.0
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def encode(self, texts: list) -> np.ndarray:
        if not self._fitted:
            self._fit(texts)
        return np.array([self._vectorize(t) for t in texts])

    def name(self) -> str:
        return "tfidf-keyword-fallback"


def _get_embedder():
    try:
        return SentenceTransformerEmbedder()
    except Exception as e:
        print(f"  [WARN] sentence-transformers unavailable ({e}). Using TF-IDF fallback.")
        return TFIDFEmbedder()


# =============================================================================
# INDEX BACKENDS
# =============================================================================

def _cosine_search(query_vec: np.ndarray,
                   stored_vecs: np.ndarray,
                   top_k: int) -> tuple:
    """NumPy cosine similarity search (both vectors L2-normalised)."""
    scores = stored_vecs @ query_vec
    top_idxs = np.argsort(scores)[::-1][:top_k]
    return top_idxs, scores[top_idxs]


# =============================================================================
# VECTOR STORE
# =============================================================================

class VectorStore:
    """
    Local in-memory vector store with optional disk persistence.

    Usage:
        store = VectorStore()
        store.build()               # build index from events_clean.json
        results = store.search("Person 2 left", top_k=3)
    """

    def __init__(self, index_file: str = INDEX_FILE):
        self.index_file = index_file
        self.embedder   = None
        self.documents  = []     # list of doc dicts (with "text" field)
        self.vectors    = None   # np.ndarray shape (N, D)
        self._faiss_idx = None
        self._built     = False

    # ── Build ─────────────────────────────────────────────────────────────────

    def build(self, force: bool = False):
        """Build the index from events_clean.json."""
        if self._built and not force:
            return

        self.embedder  = _get_embedder()
        self.documents = load_documents()

        texts = [d["text"] for d in self.documents]
        print(f"  Embedding {len(texts)} event documents ...")
        self.vectors = self.embedder.encode(texts)
        print(f"  Vectors shape: {self.vectors.shape}  |  backend: {self.embedder.name()}")

        # Try FAISS
        try:
            import faiss
            dim = self.vectors.shape[1]
            self._faiss_idx = faiss.IndexFlatIP(dim)   # inner-product (cosine with L2-norm)
            self._faiss_idx.add(self.vectors.astype(np.float32))
            print("  FAISS index built.")
        except Exception:
            self._faiss_idx = None
            print("  Using NumPy cosine similarity (FAISS not available).")

        self._built = True

    # ── Search ────────────────────────────────────────────────────────────────

    def search(self, query: str, top_k: int = 5) -> list:
        """
        Semantic search over event documents.

        Returns list of dicts:
          { doc fields..., "score": float, "rank": int }
        """
        if not self._built:
            self.build()

        q_vec = self.embedder.encode([query])[0]

        if self._faiss_idx is not None:
            import faiss
            q_arr  = q_vec.reshape(1, -1).astype(np.float32)
            scores, idxs = self._faiss_idx.search(q_arr, top_k)
            scores, idxs = scores[0], idxs[0]
        else:
            idxs, scores = _cosine_search(q_vec, self.vectors, top_k)

        results = []
        for rank, (idx, score) in enumerate(zip(idxs, scores), start=1):
            if idx < 0:          # FAISS may return -1 for empty slots
                continue
            doc = dict(self.documents[idx])
            doc["score"]  = float(score)
            doc["rank"]   = rank
            doc["source"] = "vector_store"
            results.append(doc)
        return results

    # ── Persistence ───────────────────────────────────────────────────────────

    def save(self):
        os.makedirs(os.path.dirname(self.index_file) or ".", exist_ok=True)
        payload = {
            "documents" : self.documents,
            "vectors"   : self.vectors,
            "embedder"  : self.embedder.name(),
        }
        with open(self.index_file, "wb") as f:
            pickle.dump(payload, f)
        print(f"  Index saved to: {self.index_file}")

    def load(self) -> bool:
        if not os.path.isfile(self.index_file):
            return False
        with open(self.index_file, "rb") as f:
            payload = pickle.load(f)
        self.documents = payload["documents"]
        self.vectors   = payload["vectors"]
        self._built    = True
        print(f"  Index loaded from: {self.index_file}  "
              f"({len(self.documents)} docs, backend: {payload['embedder']})")
        return True


# ── Module-level singleton ─────────────────────────────────────────────────────
_store = VectorStore()


def get_store() -> VectorStore:
    """Return the singleton VectorStore, building it on first call."""
    if not _store._built:
        _store.build()
    return _store


# ── Self-test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Building vector store...")
    store = VectorStore()
    store.build()
    store.save()

    queries = [
        "Person 2 left the scene",
        "who entered first",
        "how long did person 1 stay",
    ]
    for q in queries:
        print(f"\nQuery: {q}")
        results = store.search(q, top_k=3)
        for r in results:
            print(f"  [{r['rank']}] score={r['score']:.3f}  "
                  f"[{r['event_id']}] {r['person_label']} {r['action']} @ {r['start_time']}s")
            print(f"       {r['text']}")
