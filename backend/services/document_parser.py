from pypdf import PdfReader
import io

def parse_pdf(contents: bytes) -> list[str]:
    """Extract text from PDF bytes, returning list of page texts."""
    reader = PdfReader(io.BytesIO(contents))
    chunks = []
    for page in reader.pages:
        text = page.extract_text()
        if text and text.strip():
            chunks.append(text.strip())
    return chunks
