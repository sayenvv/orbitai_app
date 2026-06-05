from __future__ import annotations

import numpy as np


def cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    denom = float(np.linalg.norm(va) * np.linalg.norm(vb))
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def batch_cosine_similarity(query: list[float], embeddings: list[list[float]]) -> np.ndarray:
    if not embeddings:
        return np.array([], dtype=np.float32)

    q = np.asarray(query, dtype=np.float32)
    q_norm = float(np.linalg.norm(q))
    if q_norm == 0:
        return np.zeros(len(embeddings), dtype=np.float32)

    matrix = np.asarray(embeddings, dtype=np.float32)
    norms = np.linalg.norm(matrix, axis=1)
    dots = matrix @ q
    denom = norms * q_norm
    with np.errstate(divide="ignore", invalid="ignore"):
        scores = np.divide(dots, denom, out=np.zeros_like(dots, dtype=np.float32), where=denom > 0)
    return scores
