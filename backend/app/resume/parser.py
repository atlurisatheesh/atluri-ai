from pypdf import PdfReader
from docx import Document
from io import BytesIO

def parse_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    text = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            text.append(t)
    return "\n".join(text)

def parse_docx(file_bytes: bytes) -> str:
    doc = Document(BytesIO(file_bytes))
    return "\n".join([p.text for p in doc.paragraphs])

def parse_resume(filename: str, file_bytes: bytes) -> str:
    name = str(filename or "").lower().strip()
    if name.endswith(".pdf"):
        return parse_pdf(file_bytes)
    elif name.endswith(".docx"):
        return parse_docx(file_bytes)
    else:
        raise ValueError("Unsupported file format. Please upload a PDF or DOCX file.")
