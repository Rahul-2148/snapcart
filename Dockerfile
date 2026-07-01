FROM python:3.10-slim

WORKDIR /app

# Install system dependencies needed for OpenCV
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY services/ml-engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/ml-engine/ .

# Expose the default port Hugging Face Spaces listens to
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
