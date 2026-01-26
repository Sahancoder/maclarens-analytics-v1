FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY seed_standalone.py .
COPY seed_real_data.py .

EXPOSE 8000

# Production mode
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
