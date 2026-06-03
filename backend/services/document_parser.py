from pypdf import PdfReader
import io
import re


def _clean_page_text(text: str) -> str:
    """
    Clean a single page's extracted text:
    - Remove standalone page numbers (single number on a line, e.g. "58")
    - Remove repeated short lines (headers/footers)
    - Normalize whitespace
    """
    lines = text.splitlines()
    cleaned = []
    for line in lines:
        stripped = line.strip()
        # Skip standalone page numbers (1-4 digit number alone on a line)
        if re.fullmatch(r'\d{1,4}', stripped):
            continue
        # Skip very short lines that look like page headers (e.g. "Bilgi Lisansüstü Yönetmeliği")
        # We keep them if they're part of real content (> 3 words)
        if len(stripped.split()) <= 2 and len(stripped) < 30:
            continue
        cleaned.append(line)
    return "\n".join(cleaned).strip()


def _clean_full_text(text: str) -> str:
    """
    Post-join cleaning on the full concatenated text.
    SAFE: only removes page numbers at the END of lines — never removes
    inline numbers like "14 üncü" or "44 üncü" that are part of sentences.
    """
    # Remove standalone page number lines between two newlines: "\n58\n"
    text = re.sub(r'\n[ \t]*(\d{1,3})[ \t]*\n', '\n', text)
    # Remove page number at the very end of a line (preceded by space, no letters after)
    text = re.sub(r'[ \t]+(\d{1,3})[ \t]*$', '', text, flags=re.MULTILINE)
    # Collapse excessive blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()


def parse_pdf(contents: bytes) -> list[str]:
    """
    Extract and clean text from PDF bytes.
    Returns list of page texts with page numbers and artifacts removed.
    """
    reader = PdfReader(io.BytesIO(contents))
    chunks = []
    for page in reader.pages:
        raw = page.extract_text()
        if raw and raw.strip():
            cleaned = _clean_page_text(raw)
            if cleaned:
                chunks.append(cleaned)
    return chunks
