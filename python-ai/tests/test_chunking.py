import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.chunking import split_text, chunk_pages


def test_short_text_returns_single_chunk():
    text = "This is a short piece of text."
    chunks = split_text(text, chunk_size=800, chunk_overlap=150)
    assert chunks == [text]


def test_long_text_splits_into_multiple_chunks():
    text = "Paragraph one. " * 100  # long enough to require splitting
    chunks = split_text(text, chunk_size=200, chunk_overlap=50)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk) <= 260  # allows for overlap prefix


def test_chunk_pages_preserves_page_numbers():
    pages = [("Some text on page one. " * 5, 1), ("Some text on page two. " * 5, 2)]
    chunks = chunk_pages(pages, chunk_size=100, chunk_overlap=20)
    assert any(c.page_number == 1 for c in chunks)
    assert any(c.page_number == 2 for c in chunks)


def test_empty_text_produces_no_chunks():
    chunks = split_text("   ", chunk_size=800, chunk_overlap=150)
    assert chunks == []
