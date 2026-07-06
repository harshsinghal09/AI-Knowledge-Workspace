"""
Recursive character text splitter, implemented from scratch (no LangChain
dependency) to keep the AI service's dependency surface small and the
splitting logic fully transparent and testable.
"""

SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


class TextChunk:
    def __init__(self, text: str, page_number: int | None, chunk_index: int):
        self.text = text
        self.page_number = page_number
        self.chunk_index = chunk_index


def split_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """Recursively splits on the first separator that yields pieces small
    enough to fit chunk_size, falling back to smaller separators as needed.
    Overlap is applied exactly once, after all recursive splitting is done,
    to avoid compounding overlap across nested recursive calls."""
    if len(text) <= chunk_size:
        return [text] if text.strip() else []

    raw_chunks = _recursive_split(text, SEPARATORS, chunk_size)
    return _apply_overlap(raw_chunks, chunk_overlap) if chunk_overlap > 0 else raw_chunks


def _recursive_split(text: str, separators: list[str], chunk_size: int) -> list[str]:
    if not separators:
        return _hard_split(text, chunk_size)

    sep, *rest = separators
    pieces = text.split(sep) if sep else list(text)

    chunks: list[str] = []
    current = ""

    for piece in pieces:
        candidate = current + (sep if current else "") + piece
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                chunks.append(current)
            if len(piece) > chunk_size:
                chunks.extend(_recursive_split(piece, rest, chunk_size))
                current = ""
            else:
                current = piece

    if current:
        chunks.append(current)

    return chunks


def _hard_split(text: str, chunk_size: int) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end
    return chunks


def _apply_overlap(chunks: list[str], overlap: int) -> list[str]:
    if len(chunks) <= 1:
        return chunks

    overlapped = [chunks[0]]
    for i in range(1, len(chunks)):
        prev_tail = chunks[i - 1][-overlap:] if overlap < len(chunks[i - 1]) else chunks[i - 1]
        overlapped.append(prev_tail + chunks[i])
    return overlapped


def chunk_pages(pages: list[tuple[str, int | None]], chunk_size: int, chunk_overlap: int) -> list[TextChunk]:
    result: list[TextChunk] = []
    idx = 0
    for text, page_number in pages:
        for piece in split_text(text, chunk_size, chunk_overlap):
            if piece.strip():
                result.append(TextChunk(text=piece.strip(), page_number=page_number, chunk_index=idx))
                idx += 1
    return result
