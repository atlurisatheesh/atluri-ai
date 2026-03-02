FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Default: 4 workers for horizontal scaling
ENV WORKERS=4 HOST=0.0.0.0 PORT=9010 LOG_LEVEL=info

EXPOSE 9010

CMD ["python", "uvicorn_config.py"]
