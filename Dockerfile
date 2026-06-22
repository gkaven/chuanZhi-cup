FROM python:3.10-slim

WORKDIR /app
COPY backend/ ./backend/
COPY data/ ./data/
COPY .env .

RUN pip install --no-cache-dir \
    fastapi uvicorn langchain langgraph langchain-community \
    chromadb sentence-transformers pdfplumber python-docx \
    PyMySQL redis python-jose[cryptography] passlib openai \
    python-multipart httpx scikit-learn python-dotenv requests

EXPOSE 8001
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8001"]
