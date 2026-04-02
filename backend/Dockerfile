FROM python:3.11-slim

WORKDIR /app

# Install system deps (gcc for C extensions, weasyprint deps for PDF export)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    libcairo2 libgirepository1.0-dev gir1.2-pango-1.0 && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Default: 4 workers for horizontal scaling
ENV WORKERS=4 HOST=0.0.0.0 LOG_LEVEL=info

# PORT is set by Render.com at runtime; default to 9010 for local
ENV PORT=9010

EXPOSE 9010

CMD ["python", "uvicorn_config.py"]
