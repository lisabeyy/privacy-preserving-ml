# Privacy-Preserving ML with Differential Privacy & TEE

A complete platform demonstrating how to build privacy-preserving machine learning using **Differential Privacy** and **Trusted Execution Environments (TEE)**. This project shows how to analyze sensitive financial data while protecting individual privacy.

## 🎯 What This Does

- **Encrypts** financial data before sending to TEE
- **Processes** data inside hardware-isolated secure enclave
- **Applies** Differential Privacy to prevent reverse-engineering
- **Generates** cryptographic attestation proofs
- **Visualizes** raw vs. privacy-protected results

## 🏗️ Architecture

```
Frontend (React/Next.js)
    ↓
Backend (Node.js/Express)
    ↓ (Fernet-encrypted data)
TEE Service (Python/Flask in Intel TDX)
    ↓ (decrypts inside TEE)
    ↓ (runs risk analysis)
    ↓ (applies Differential Privacy)
    ↓ (generates attestation)
Backend
    ↓
Frontend (displays results)
```

## 📁 Project Structure

```
├── frontend/          # Next.js UI with charts and visualizations
├── backend/           # Express API, encryption, attestation verification
├── tee_service/       # Python Flask service (runs in TEE)
│   ├── enclave_entry.py    # Main Flask app
│   ├── risk_model.py       # Financial risk scoring
│   ├── dp_logic.py         # Differential Privacy implementation
│   └── attestation.py       # TEE attestation utilities
├── mock_data/         # Sample financial datasets
└── DEPLOYMENT.md      # Docker & Phala Cloud deployment guide
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker (for TEE deployment)

### Local Development

1. **Start Backend**:
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3001
```

2. **Start Frontend**:
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

3. **Start TEE Service** (Simulation Mode):
```bash
cd tee_service
pip install -r requirements.txt
python enclave_entry.py
# Runs on http://localhost:8080
```

### Configuration

**Backend** (`backend/.env`):
```env
PORT=3001
TEE_URL=http://localhost:8080  # For local simulation
# TEE_URL=https://your-app.phala.network  # For Phala Cloud
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🔐 Key Concepts

### Differential Privacy (DP)

Adds carefully calibrated **Laplace noise** to query results. The privacy budget **epsilon (ε)** controls the tradeoff:
- **Lower ε** (0.1-0.5) = stronger privacy, more noise
- **Higher ε** (5-10) = less privacy, less noise, more accuracy

### Trusted Execution Environment (TEE)

Hardware-isolated secure enclave where:
- Data is encrypted in transit
- Decryption only happens inside TEE
- Even cloud providers can't see inside
- Attestation proves computation ran securely

### Attestation

Cryptographic proof that:
- Code ran in real TEE hardware (Intel TDX quote)
- Results came from trusted source (Ethereum signature)
- Both work together for defense in depth

## 🎨 Features

- **Interactive Privacy Budget Slider**: See how epsilon affects accuracy
- **Visual Charts**: Pie charts, bar charts with tooltips
- **Raw vs Protected Comparison**: Side-by-side metrics
- **Attestation Verification**: Cryptographic proof of secure execution
- **Risk Analytics**: Credit scores, demographics, default rates

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Docker setup and Phala Cloud deployment
- **[TUTORIAL_SCRIPT.md](./TUTORIAL_SCRIPT.md)**: Complete tutorial explaining DP, TEE, and implementation

## 🔒 Security Notes

- **Encryption**: Fernet symmetric encryption (in transit)
- **Key Management**: MVP sends key with data (secure because TEE-isolated)
- **Production**: Use KMS (Key Management Service) for key provisioning
- **Attestation**: Intel TDX quote + Ethereum signature for verification

## 🧪 Testing

```bash
# Test TEE service health
curl http://localhost:8080/health

# Test backend
curl http://localhost:3001/api/health
```

## 🌐 Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for:
- Building Docker images
- Deploying to Phala Cloud
- Switching between local and production modes

## 📖 Learn More

- **Differential Privacy**: Mathematical framework for privacy-preserving analytics
- **TEE**: Hardware security for confidential computing
- **Attestation**: Cryptographic proofs of secure execution

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Recharts, Tailwind CSS
- **Backend**: Node.js, Express, Fernet encryption
- **TEE Service**: Python, Flask, DStack SDK
- **Deployment**: Docker, Phala Cloud (Intel TDX)

## 📝 License

MIT License
