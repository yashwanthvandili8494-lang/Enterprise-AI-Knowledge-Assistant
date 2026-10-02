import io
import csv
from typing import List, Dict, Any
from pathlib import Path

# PDF Extraction using PyMuPDF (fitz)
try:
    import pymupdf as fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

# DOCX Extraction using python-docx
try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False


class ExtractedPage:
    def __init__(self, page_number: int, content: str, metadata: Dict[str, Any] = None):
        self.page_number = page_number
        self.content = content.strip()
        self.metadata = metadata or {}

    def to_dict(self):
        return {
            "page_number": self.page_number,
            "content": self.content,
            "metadata": self.metadata
        }


def extract_text_from_pdf(content_bytes: bytes) -> List[ExtractedPage]:
    """Extracts text page-by-page from PDF bytes using PyMuPDF."""
    pages = []
    if not HAS_PYMUPDF:
        raise RuntimeError("PyMuPDF is not installed for PDF processing")

    doc = fitz.open(stream=content_bytes, filetype="pdf")
    try:
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            text = page.get_text("text")
            if text.strip():
                pages.append(ExtractedPage(page_number=page_idx + 1, content=text))
    finally:
        doc.close()
    return pages


def extract_text_from_docx(content_bytes: bytes) -> List[ExtractedPage]:
    """Extracts text from DOCX bytes using python-docx, preserving paragraph blocks."""
    if not HAS_DOCX:
        raise RuntimeError("python-docx is not installed for DOCX processing")

    doc = docx.Document(io.BytesIO(content_bytes))
    paragraphs = []
    
    # Extract headings and body paragraphs
    for p in doc.paragraphs:
        txt = p.text.strip()
        if txt:
            paragraphs.append(txt)
    
    # Also extract tables
    for table in doc.tables:
        table_rows = []
        for row in table.rows:
            row_data = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_data:
                table_rows.append(" | ".join(row_data))
        if table_rows:
            paragraphs.append("\n".join(table_rows))

    full_text = "\n\n".join(paragraphs)
    # Estimate pages (approx 500 words per page)
    words = full_text.split()
    if not words:
        return []
        
    pages = []
    words_per_page = 450
    for i in range(0, len(words), words_per_page):
        page_num = (i // words_per_page) + 1
        page_text = " ".join(words[i:i + words_per_page])
        pages.append(ExtractedPage(page_number=page_num, content=page_text))
        
    return pages


def extract_text_from_txt(content_bytes: bytes) -> List[ExtractedPage]:
    """Extracts plain text, attempting UTF-8 then latin-1 decoding."""
    try:
        text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = content_bytes.decode("latin-1")

    # Split into logical sections/pages if large, or single page
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    pages = []
    
    current_page = []
    current_len = 0
    page_num = 1
    
    for p in paragraphs:
        current_page.append(p)
        current_len += len(p)
        if current_len >= 2000:
            pages.append(ExtractedPage(page_number=page_num, content="\n\n".join(current_page)))
            current_page = []
            current_len = 0
            page_num += 1
            
    if current_page:
        pages.append(ExtractedPage(page_number=page_num, content="\n\n".join(current_page)))
        
    return pages if pages else [ExtractedPage(page_number=1, content=text.strip())]


def extract_text_from_csv(content_bytes: bytes) -> List[ExtractedPage]:
    """Extracts CSV data into formatted structured text entries."""
    try:
        decoded = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        decoded = content_bytes.decode("latin-1")

    reader = csv.reader(io.StringIO(decoded))
    rows = list(reader)
    if not rows:
        return []

    header = rows[0]
    formatted_rows = []
    for r in rows[1:]:
        if any(cell.strip() for cell in r):
            row_items = [f"{header[i]}: {r[i]}" for i in range(min(len(header), len(r))) if header[i].strip()]
            formatted_rows.append(", ".join(row_items))

    # Batch into pages of 30 records
    pages = []
    batch_size = 30
    for idx in range(0, len(formatted_rows), batch_size):
        page_num = (idx // batch_size) + 1
        page_content = "\n".join(formatted_rows[idx:idx + batch_size])
        pages.append(ExtractedPage(page_number=page_num, content=page_content))
        
    return pages if pages else [ExtractedPage(page_number=1, content="\n".join([", ".join(r) for r in rows]))]


def extract_document_text(filename: str, content_bytes: bytes) -> List[ExtractedPage]:
    """Route document extraction based on file extension."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(content_bytes)
    elif ext in [".docx", ".doc"]:
        return extract_text_from_docx(content_bytes)
    elif ext == ".csv":
        return extract_text_from_csv(content_bytes)
    elif ext in [".txt", ".md", ".json"]:
        return extract_text_from_txt(content_bytes)
    else:
        raise ValueError(f"Unsupported file format: {ext}. Supported formats: PDF, DOCX, TXT, CSV")
