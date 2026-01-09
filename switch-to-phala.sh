#!/bin/bash

# Script to switch backend to use Phala Cloud TEE

if [ -z "$1" ]; then
  echo "Usage: ./switch-to-phala.sh <phala-endpoint-url>"
  echo ""
  echo "Example:"
  echo "  ./switch-to-phala.sh https://my-app.phala.network"
  echo ""
  echo "Or to switch back to local:"
  echo "  ./switch-to-phala.sh local"
  exit 1
fi

PHALA_URL="$1"

if [ "$PHALA_URL" = "local" ]; then
  echo "Switching backend to use LOCAL TEE..."
  cat > backend/.env << EOF
TEE_URL=http://localhost:8080
PORT=3001
EOF
  echo "✅ Backend configured to use local TEE (http://localhost:8080)"
  echo ""
  echo "Make sure local TEE is running:"
  echo "  cd tee_service/docker && docker compose up -d"
else
  echo "Switching backend to use PHALA CLOUD..."
  cat > backend/.env << EOF
TEE_URL=$PHALA_URL
PORT=3001
EOF
  echo "✅ Backend configured to use Phala Cloud: $PHALA_URL"
  echo ""
  echo "Test Phala endpoint:"
  echo "  curl $PHALA_URL/health"
fi

echo ""
echo "Restart your backend:"
echo "  cd backend && npm run dev"

