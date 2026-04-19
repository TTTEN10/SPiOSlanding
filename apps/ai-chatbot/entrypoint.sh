#!/bin/bash
set -e

# Default values
USE_GPU=${USE_GPU:-false}
MODEL_NAME=${MODEL_NAME:-Qwen/Qwen2.5-1.5B-Instruct}

echo "=== AI Chatbot Service Entrypoint ==="
echo "USE_GPU: $USE_GPU"
echo "MODEL_NAME: $MODEL_NAME"
echo "PORT: ${PORT:-8000}"

# If GPU mode is enabled, install vLLM
if [ "$USE_GPU" = "true" ]; then
    echo "GPU mode enabled - checking for vLLM..."
    
    # Check if vLLM is installed
    if ! python3 -c "import vllm" 2>/dev/null; then
        echo "vLLM not found. Installing vLLM..."
        pip3 install --no-cache-dir vllm
    else
        echo "vLLM already installed"
    fi
    
    # Verify CUDA availability
    if command -v nvidia-smi &> /dev/null; then
        echo "CUDA devices available:"
        nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
    else
        echo "WARNING: nvidia-smi not found. GPU may not be available."
    fi
else
    echo "Non-GPU mode (USE_GPU=false) - skipping vLLM installation"
fi

# Download model at startup if MODEL_DOWNLOAD=true (optional)
if [ "${MODEL_DOWNLOAD:-false}" = "true" ] && [ "$USE_GPU" = "true" ]; then
    echo "Model download enabled. Downloading model: $MODEL_NAME"
    # Model will be downloaded by vLLM on first use
    # This is handled automatically by vLLM
fi

# Start the application
exec "$@"

