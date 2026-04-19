FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch first (~hundreds of MB) — default pip torch pulls CUDA stacks and can fill the disk.
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py prompt_builder.py session_redis.py ./
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Fail the image build if optional modules were not copied correctly
RUN python -c "import prompt_builder, session_redis"

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV USE_GPU=false
ENV USE_MOCK_RESPONSES=false

EXPOSE 8000

# Image-level check (compose also defines healthcheck with longer start_period for HF).
HEALTHCHECK --interval=30s --timeout=12s --start-period=90s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8000/health >/dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
