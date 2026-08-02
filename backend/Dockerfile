FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads and data directories
RUN mkdir -p uploads data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# --proxy-headers makes uvicorn honor X-Forwarded-For/Proto set by the nginx
# frontend proxy, so request.client.host reflects the real client IP (login
# rate limit, audit logs) instead of the internal proxy address.
# --forwarded-allow-ips='*' is safe here because the backend has no published
# host port in docker-compose.yml — it is only reachable over the internal
# csat-network via the nginx proxy, never directly by clients.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
