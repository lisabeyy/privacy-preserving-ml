#!/bin/bash

# Quick script to rebuild and push Docker image for Phala

set -e

DOCKERHUB_USERNAME="lisabey"
IMAGE_NAME="analytics-tee-service"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "🔨 Building Docker image for linux/amd64 (Phala requirement)..."
echo ""

# Build for linux/amd64
docker build --platform linux/amd64 -t ${FULL_IMAGE_NAME} .

echo ""
echo "✅ Build complete!"
echo ""
echo "📤 Pushing to Docker Hub..."
docker push ${FULL_IMAGE_NAME}

echo ""
echo "✅ Pushed to Docker Hub!"
echo ""
echo "⚠️  NOTE: This script does NOT automatically restart Phala."
echo "   You must manually restart in the Phala Cloud dashboard."
echo ""
echo "🔄 Next steps (MANUAL):"
echo "   1. Go to https://cloud.phala.network"
echo "   2. Find your deployment"
echo "   3. Click 'Restart' or 'Redeploy' button"
echo "   4. Wait 30-60 seconds for container to restart"
echo "   5. Check logs to verify Flask app is running"
echo ""
echo "💡 Tip: Phala will auto-pull the new image if 'pull_policy: always' is set"
echo ""
echo "📝 To verify the image architecture:"
echo "   docker inspect ${FULL_IMAGE_NAME} | grep Architecture"
echo "   Should show: \"Architecture\": \"amd64\""
