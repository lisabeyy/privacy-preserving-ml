#!/bin/bash

# Build script for TEE Analytics Service Docker image
# Similar to private-ml-sdk/vllm-proxy/docker/build.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Building TEE Analytics Service Docker image..."

cd "$PROJECT_ROOT"

# Build the Docker image
docker build -t analytics-tee-service:latest .

echo "Build complete!"
echo "Image: analytics-tee-service:latest"
echo ""
echo "To run with docker-compose:"
echo "  cd docker && docker compose up -d"
echo ""
echo "To run directly:"
echo "  docker run --privileged -v /var/run/dstack.sock:/var/run/dstack.sock -p 8080:8080 analytics-tee-service:latest"

