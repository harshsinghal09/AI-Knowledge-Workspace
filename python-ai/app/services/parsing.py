import re
from pathlib import Path

from pypdf import PdfReader
from docx import Document as DocxDocument


class UnsupportedFileTypeError(Exception):
    pass


class EmptyDocumentError(Exception):
    pass


def extract_text(file_path: str, mime_type: str) -> list[tuple[str, int | None]]:
    """
    Returns a list of (text, page_number) tuples. page_number is None for
    formats without a native page concept (markdown, txt, docx).
    """
    suffix = Path(file_path).suffix.lower()

    if suffix == ".pdf":
        return _extract_pdf(file_path)
    if suffix == ".docx":
        return [(_extract_docx(file_path), None)]
    if suffix in (".md", ".txt"):
        return [(_extract_plain(file_path), None)]

    raise UnsupportedFileTypeError(f"Unsupported file extension: {suffix}")


def _extract_pdf(file_path: str) -> list[tuple[str, int | None]]:
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append((text, i + 1))
    if not pages:
        raise EmptyDocumentError("No extractable text found in PDF")
    return pages


def _extract_docx(file_path: str) -> str:
    doc = DocxDocument(file_path)
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    if not text.strip():
        raise EmptyDocumentError("No extractable text found in DOCX")
    return text


def _extract_plain(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    if not text.strip():
        raise EmptyDocumentError("File is empty")
    return text


def clean_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
