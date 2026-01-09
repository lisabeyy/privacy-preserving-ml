# Infrastructure

Scripts and configurations for deploying the TEE service to confidential computing environments.

## Prerequisites

- Access to TEE-capable hardware (Intel TDX) or simulation mode
- Docker installed
- private-ml-sdk built and available

## Deployment Options

### 1. Local Development (Simulation Mode)

For testing without TEE hardware:

```bash
cd ../tee_service
docker-compose up --build
```

This runs the service in simulation mode (TEE features will be unavailable but the service will still function).

### 2. TEE Deployment with dstack-vmm

Follow the private-ml-sdk documentation to:

1. Build the TDX guest image
2. Set up dstack-vmm
3. Deploy using the provided docker-compose.yml

#### Step 1: Build TEE Image

```bash
# In private-ml-sdk directory
./build.sh
```

#### Step 2: Copy Images to dstack-vmm

```bash
cp -r /path/to/private-ml-sdk/images/dstack-nvidia-dev-*/ /path/to/dstack-vmm/images/
```

#### Step 3: Create App Compose

```bash
cd ../tee_service
./vmm-cli.py compose \
  --name confidential-analytics \
  --docker-compose ./docker-compose.yml \
  --kms \
  --output ./app-compose.json
```

#### Step 4: Deploy CVM

```bash
./vmm-cli.py deploy \
  --name analytics-cvm \
  --image <image-name-from-lsimage> \
  --compose ./app-compose.json \
  --vcpu 2 --memory 4G --disk 100G \
  --port tcp:127.0.0.1:8080:8080 \
  --kms-url https://localhost:3443
```

### 3. Cloud Confidential VMs

For production deployments on:
- AWS Nitro Enclaves
- Azure Confidential VMs
- Google Cloud Confidential Computing

See cloud-specific documentation for deployment instructions.

## Environment Variables

The TEE service supports the following environment variables:

- `PORT`: Service port (default: 8080)
- `DP_EPSILON`: Default privacy budget (default: 1.0)
- `TEE_TIMESTAMP`: Timestamp for attestation (optional)

## Security Notes

- In production, always use KMS for key management
- Never hardcode encryption keys
- Use secure channels for all communications
- Regularly update TEE images and dependencies

