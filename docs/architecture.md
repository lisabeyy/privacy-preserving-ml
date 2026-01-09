# Architecture Documentation

## System Overview

The Confidential Collaborative Analytics Platform enables multiple parties to contribute sensitive financial data for risk scoring analytics while maintaining strong privacy guarantees through:

1. **Trusted Execution Environments (TEE)**: Hardware-based isolation
2. **Differential Privacy (DP)**: Mathematical privacy guarantees
3. **Remote Attestation**: Cryptographic proof of secure execution

## Component Architecture

### Frontend (Next.js)

- **Location**: `/frontend`
- **Purpose**: User interface for data upload and result visualization
- **Technologies**: Next.js 14, React, TypeScript, Tailwind CSS

**Key Features**:
- File upload (CSV/JSON)
- Privacy budget configuration
- Real-time job status
- Attestation verification UI

### Backend API (Express.js)

- **Location**: `/backend`
- **Purpose**: Gateway between frontend and TEE service
- **Technologies**: Express.js, Node.js

**Responsibilities**:
- Accept encrypted data submissions
- Queue analytics jobs
- Route requests to TEE service
- Return DP-protected results
- Handle attestation verification

**API Endpoints**:
- `POST /api/submit`: Submit data for analysis
- `GET /api/job/:jobId`: Get job status and results
- `GET /api/attestation`: Get TEE attestation quote
- `POST /api/verify`: Verify attestation signature
- `GET /api/health`: Health check

### TEE Service (Python/Flask)

- **Location**: `/tee_service`
- **Purpose**: Secure analytics execution inside enclave
- **Technologies**: Python, Flask, dstack-sdk

**Core Modules**:

1. **risk_model.py**: Risk scoring algorithm
   - Calculates individual risk scores
   - Aggregates metrics (mean, median, percentiles)

2. **dp_logic.py**: Differential Privacy implementation
   - Laplace mechanism for noise addition
   - Privacy budget management
   - Sensitivity calculations

3. **attestation.py**: TEE attestation utilities
   - Intel TDX quote generation
   - Result signing
   - Signature verification

4. **enclave_entry.py**: Main service entry point
   - Flask API server
   - Data decryption inside enclave
   - Orchestrates analytics pipeline

**Service Endpoints**:
- `POST /analyze`: Main analytics endpoint
- `GET /attestation`: Get TEE quote
- `GET /health`: Health check

## Data Flow

```
1. User uploads financial data (CSV/JSON)
   ↓
2. Frontend sends to Backend API
   ↓
3. Backend encrypts data and queues job
   ↓
4. Backend sends encrypted data to TEE Service
   ↓
5. TEE Service (inside enclave):
   - Decrypts data
   - Runs risk scoring
   - Applies Differential Privacy
   - Generates attestation
   ↓
6. TEE Service returns DP-protected results + attestation
   ↓
7. Backend stores results
   ↓
8. Frontend polls for results and displays
```

## Privacy Guarantees

### Differential Privacy

- **Epsilon (ε)**: Privacy budget parameter
  - Lower values = stronger privacy
  - Typical range: 0.1 - 10
  - Default: 1.0

- **Mechanism**: Gaussian noise addition
  - Noise scale = sqrt(2*ln(1.25/δ)) * sensitivity / epsilon
  - Provides (epsilon, delta)-DP
  - Better composition bounds for many queries
  - Minimum epsilon protection prevents excessive noise
  - Protects individual contributions

### TEE Protection

- **Hardware Isolation**: Data only decrypted inside enclave
- **Code Integrity**: Attestation proves correct code execution
- **Remote Verification**: Clients can verify enclave authenticity

## Threat Model

### Protected Against

✅ Unauthorized data access (cloud provider, admins)  
✅ Code tampering (attestation verification)  
✅ Individual data reconstruction (Differential Privacy)  
✅ Man-in-the-middle attacks (TLS + attestation)  

### Limitations

⚠️ Side-channel attacks (mitigated by hardware isolation)  
⚠️ Privacy budget exhaustion (tracked and reported)  
⚠️ Malicious enclave code (mitigated by open-source verification)  

## Security Considerations

1. **Key Management**: Use KMS in production (not hardcoded keys)
2. **Network Security**: All communications over TLS
3. **Input Validation**: Validate all inputs before processing
4. **Error Handling**: Don't leak sensitive info in error messages
5. **Audit Logging**: Log all operations (without sensitive data)

## Performance

- **Latency**: TEE overhead typically < 5%
- **Throughput**: Scales with available TEE resources
- **Privacy Cost**: DP noise increases with stronger privacy (lower epsilon)

## Future Enhancements

- Multi-party computation (MPC) integration
- Advanced DP mechanisms (Gaussian, exponential)
- Real-time streaming analytics
- Federated learning support
- Enhanced attestation verification UI

