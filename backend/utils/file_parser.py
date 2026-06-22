import pdfplumber
import docx
import re

def parse_resume(file_path: str) -> str:
    fp = file_path.lower()
    if fp.endswith(".pdf"):
        with pdfplumber.open(file_path) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    elif fp.endswith((".docx", ".doc")):
        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)
    elif fp.endswith((".txt", ".md")):
        for enc in ("utf-8", "gbk", "utf-16"):
            try:
                with open(file_path, encoding=enc) as f:
                    text = f.read()
                # 去除 Markdown 语法符号
                text = re.sub(r'#{1,6}\s', '', text)
                text = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', text)
                text = re.sub(r'`[^`]+`', '', text)
                return text
            except UnicodeDecodeError:
                continue
    return ""
