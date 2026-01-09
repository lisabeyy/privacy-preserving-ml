# TEE Analytics Service - Docker Deployment

Docker deployment for the TEE Analytics Service, following the same pattern as `private-ml-sdk/vllm-proxy`.

## Quick Start

### Build the Docker Image

```bash
bash build.sh
```

Or manually:

```bash
cd ..
docker build -t analytics-tee-service:latest .
```

### Run with Docker Compose

```bash
docker compose up -d
```

### Run Directly (without compose)

```bash
docker run --privileged \
  -v /var/run/dstack.sock:/var/run/dstack.sock \
  -p 8080:8080 \
  -e DP_EPSILON=1.0 \
  analytics-tee-service:latest
```

## Running Inside TEE (dstack CVM)

When running inside a dstack CVM (Confidential VM) with TEE hardware:

1. **Ensure Local KMS is running** (on the host, not in CVM):
   ```bash
   cd private-ml-sdk/meta-dstack-nvidia/dstack/key-provider-build/
   ./run.sh
   ```

2. **Inside the CVM**, build and run:
   ```bash
   cd /path/to/private-ml-tee-dp/tee_service/docker
   bash build.sh
   docker compose up -d
   ```

3. **Verify TEE initialization**:
   Check logs: `docker logs analytics-tee-service`
   
   You should see:
   ```
   TEE initialized. Signing address: 0x...
   ```
   
   If you see "simulation mode" warnings, verify:
   - `/var/run/dstack.sock` exists and is mounted
   - Local KMS is running on the host
   - You're inside a dstack CVM

## Environment Variables

- `PORT`: Service port (default: 8080)
- `DP_EPSILON`: Privacy budget for Differential Privacy (default: 1.0)
- `TEE_TIMESTAMP`: Optional timestamp for attestation

## Differences from vLLM Proxy

Unlike `vllm-proxy`, this service:
- ✅ **No ML inference** - Just analytics/risk scoring
- ✅ **No GPU required** - CPU-only (TDX) is sufficient
- ✅ **Simpler base image** - `python:3.10-slim` instead of `vllm/vllm-openai`
- ✅ **No model loading** - No need to download/mount models
- ✅ **Faster startup** - No model initialization time

## Troubleshooting

### TEE Not Initializing

If you see "simulation mode" warnings:

1. Check `/var/run/dstack.sock` exists:
   ```bash
   ls -la /var/run/dstack.sock
   ```

2. Verify Local KMS is running (on host, not in container)

3. Ensure you're running inside a dstack CVM with TDX support

### Port Already in Use

Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8081:8080"  # Use 8081 instead of 8080
```

### Permission Denied

Ensure the container has access to `/var/run/dstack.sock`:
- Use `privileged: true` in docker-compose
- Or run with `--privileged` flag

## Production Deployment

For production:

1. Use a specific image tag instead of `latest`
2. Set up proper logging and monitoring
3. Configure health checks
4. Use secrets management for sensitive config
5. Set up proper networking/load balancing

