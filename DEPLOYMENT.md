# Deployment Guide

Complete guide for deploying the TEE service using Docker and Phala Cloud.

## Table of Contents

1. [Docker Setup](#docker-setup)
2. [Deploy to Phala Cloud](#deploy-to-phala-cloud)
3. [Configure Backend](#configure-backend)
4. [Verify Deployment](#verify-deployment)
5. [Redeploying](#redeploying)
6. [Troubleshooting](#troubleshooting)

## Docker Setup

### Build Docker Image

The TEE service must be built for `linux/amd64` architecture (required by Phala Cloud):

**Option 1: Use the rebuild script** (Recommended):
```bash
cd tee_service
./rebuild-for-phala.sh
```

**Option 2: Manual build**:
```bash
cd tee_service

# Build for correct architecture
docker build --platform linux/amd64 -t your-username/analytics-tee-service:latest .

# Login to Docker Hub (if not already)
docker login

# Push to Docker Hub
docker push your-username/analytics-tee-service:latest
```

**Docker Hub**: Make sure you're logged in and have push access to your repository (e.g., `lisabey/analytics-tee-service`).

### Docker Compose Configuration

The `tee_service/docker-compose.yml` file configures the service for Phala:

```yaml
services:
  analytics-service:
    image: your-username/analytics-tee-service:latest
    pull_policy: always  # Force pull latest image
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - DP_EPSILON=1.0
```

## Deploy to Phala Cloud

### Step 1: Create Phala Cloud Account

1. Visit **https://cloud.phala.network**
2. Sign up or log in

### Step 2: Create New Deployment

1. Click **"Deploy"** or **"New App"**
2. Choose **"Upload docker-compose.yml"**

### Step 3: Upload Docker Compose

**Option A: Copy & Paste**
1. Open `tee_service/docker-compose.yml`
2. Copy entire contents
3. Paste into Phala Cloud deployment form

**Option B: Upload File**
1. Click "Upload File" in Phala Cloud
2. Select `tee_service/docker-compose.yml`

### Step 4: Configure Environment Variables

In Phala Cloud's environment variables section, add:

```env
PORT=8080
DP_EPSILON=1.0
TEE_TIMESTAMP=unknown
```

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait 2-5 minutes for deployment
3. **Save your TEE URL**: `https://your-app-id.phala.network`

## Configure Backend

### Update Backend Environment

Edit `backend/.env`:

```env
TEE_URL=https://your-app-id.phala.network
PORT=3001
```

### Restart Backend

```bash
cd backend
npm run dev
```

The backend will now send requests to your Phala Cloud TEE service instead of localhost.

## Get Your Phala URL

After deployment, get your endpoint URL:

**Option 1: Phala Cloud Dashboard** (Easiest)
1. Go to https://cloud.phala.network
2. Log in and go to "Deployments"
3. Find your deployment
4. Copy the endpoint URL (e.g., `https://your-app-id.phala.network`)

**Option 2: Check Deployment Logs**
- The deployment logs will show the endpoint URL
- Look for: `Endpoint: https://your-app-id.phala.network`

## Verify Deployment

### 1. Check Container Logs

In Phala Cloud dashboard, check logs for:
- ✅ `🚀 TEE Analytics Service Starting`
- ✅ `✅ Flask imported`
- ✅ `Running on http://0.0.0.0:8080`

### 2. Test Health Endpoint

```bash
curl https://your-app-id.phala.network/health
```

Should return: `{"status": "healthy"}`

### 3. Test from Frontend

1. Open frontend at http://localhost:3000
2. Submit financial data
3. Check that results come back (no 404 errors)

## Redeploying

### Quick Redeploy

**Option A: Via Phala Cloud Dashboard** (Recommended)
1. Go to https://cloud.phala.network
2. Find your deployment
3. Click **"Restart"** or **"Redeploy"**
4. Wait 30-60 seconds

**Option B: Rebuild and Redeploy**

1. **Rebuild Docker image**:
```bash
cd tee_service
./rebuild-for-phala.sh
```

2. **Redeploy on Phala**:
   - Go to Phala Cloud dashboard
   - Click "Restart" (pulls latest image automatically)

### Force Image Pull

The `docker-compose.yml` has `pull_policy: always` to ensure latest image is pulled. If cached:
1. Delete the deployment in Phala dashboard
2. Redeploy (will pull fresh image)

## Switching Between Local and Phala

### Switch to Phala Cloud

1. **Deploy to Phala** (see steps above)
2. **Update backend**:
```bash
./switch-to-phala.sh https://your-app-id.phala.network
# Or manually edit backend/.env: TEE_URL=https://your-app-id.phala.network
```
3. **Restart backend**: `cd backend && npm run dev`

### Switch Back to Local

```bash
./switch-to-phala.sh local
# Or manually edit backend/.env: TEE_URL=http://localhost:8080
cd tee_service/docker && docker compose up -d
cd ../../backend && npm run dev
```

### Check Current Mode

```bash
# Check backend config
cat backend/.env | grep TEE_URL

# Test TEE endpoint
curl $(cat backend/.env | grep TEE_URL | cut -d'=' -f2)/health
```

## Troubleshooting

### Container Keeps Restarting

**Check**:
- Container logs for Python errors
- All dependencies in `requirements.txt`
- Image built for `linux/amd64` architecture

**Fix**:
```bash
# Rebuild with correct architecture
cd tee_service
./rebuild-for-phala.sh
```

### Getting 404 Errors

**Check**:
- Wait 1-2 minutes after deploy (container needs time to start)
- Container logs show Flask started
- Phala URL is correct in `backend/.env`
- No trailing slash in URL

**Verify**:
```bash
# Test health endpoint
curl https://your-app-id.phala.network/health

# Check backend config
cat backend/.env | grep TEE_URL
```

### Connection Errors

**For Local TEE**:
```bash
# Check if TEE service is running
curl http://localhost:8080/health

# If not running, start it:
cd tee_service/docker && docker compose up -d
```

**For Phala**:
- Check Phala Cloud dashboard
- Verify app is deployed and running
- Make sure URL is correct (no trailing slash)

### Image Not Updating

**Fix**:
- Ensure `pull_policy: always` in `docker-compose.yml`
- Delete deployment and redeploy
- Or manually delete image in Phala dashboard

### Connection Timeouts

**Check**:
- Phala service is running (check logs)
- Backend retry logic (5 attempts with exponential backoff)
- Network connectivity

**Fix**:
- Increase timeout in `backend/server.js` (currently 120 seconds)
- Check Phala Cloud status page

### Test Your Setup

Use the test script:
```bash
./test-api.sh
```

This will test:
- Backend health
- TEE service health
- Full submission flow

## Local vs Production

### Local Development (Simulation Mode)

- TEE service runs on `localhost:8080`
- No real TEE hardware required
- Ethereum signature works, Intel quote doesn't
- Good for development and testing

### Production (Phala Cloud)

- TEE service runs on Phala Cloud
- Real Intel TDX hardware
- Both Intel quote and Ethereum signature work
- Full security guarantees

### Switching Modes

Just update `backend/.env`:
```env
# Local
TEE_URL=http://localhost:8080

# Production
TEE_URL=https://your-app-id.phala.network
```

Then restart the backend.

## Next Steps

- ✅ TEE service deployed to Phala Cloud
- ✅ Backend configured to use Phala
- ✅ Frontend connected to backend
- ✅ Full flow working with encryption and attestation

**You're all set!** Your platform is now running on Phala Cloud with real TEE hardware! 🎉

