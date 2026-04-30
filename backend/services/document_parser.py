import pdfplumber
import io

def parse_pdf(contents: bytes) -> list[str]:
    chunks = []
    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                chunks.append(text.strip())
    return chunks
