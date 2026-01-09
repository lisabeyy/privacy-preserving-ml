# Backend Environment Setup

## Quick Setup

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cat > .env << EOF
TEE_URL=http://localhost:8080
PORT=3001
EOF
```

## Configuration

### TEE_URL

Set this to either:

- **Local**: `TEE_URL=http://localhost:8080` (for local TEE simulation)
- **Phala**: `TEE_URL=https://your-app-id.phala.network` (for Phala Cloud)

### PORT

Backend server port (default: 3001)

## Examples

### Local Development
```bash
TEE_URL=http://localhost:8080
PORT=3001
```

### Phala Cloud Production
```bash
TEE_URL=https://my-app.phala.network
PORT=3001
```

## Quick Switch

Use the switch script from project root:
```bash
# Switch to Phala
./switch-to-phala.sh https://your-app-id.phala.network

# Switch back to local
./switch-to-phala.sh local
```

