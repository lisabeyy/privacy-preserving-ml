# Quick Test Guide

Step-by-step guide to test the Confidential Collaborative Analytics Platform.

## Prerequisites

- Node.js 18+ installed
- Python 3.10+ installed
- Terminal/Command line access

## Step 1: Install Dependencies

### Backend
```bash
cd backend
npm install
cd ..
```

### Frontend
```bash
cd frontend
npm install
cd ..
```

### TEE Service
```bash
cd tee_service
pip install -r requirements.txt
cd ..
```

## Step 2: Start Services

You'll need **3 terminal windows** (or use a process manager like `tmux` or `pm2`).

### Terminal 1: TEE Service
```bash
cd tee_service
python enclave_entry.py
```

**Expected output:**
```
TEE initialized. Signing address: 0x...
 * Running on http://0.0.0.0:8080
```

**Note**: If you see "Warning: TEE initialization failed", that's OK - you're in simulation mode.

### Terminal 2: Backend API
```bash
cd backend
npm run dev
```

**Expected output:**
```
Backend API server running on port 3001
TEE Service URL: http://localhost:8080
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

**Expected output:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
```

## Step 3: Test via Web UI

1. **Open browser**: Go to http://localhost:3000

2. **Upload test data**:
   - Click "Select File"
   - Choose `mock_data/financial_data.json` or `mock_data/financial_data.csv`
   - You should see "Selected: financial_data.json (10 records)"

3. **Set privacy budget** (optional):
   - Leave epsilon at 1.0 (default) or change it

4. **Submit for analysis**:
   - Click "Submit for Analysis"
   - Wait a few seconds for processing

5. **View results**:
   - You should see risk metrics (mean, median, percentages)
   - Privacy budget information
   - Attestation details (if available)

6. **Verify attestation** (if attestation is available):
   - Click "Verify Attestation" button
   - Check if verification passes

## Step 4: Test via API (Alternative)

### Test Backend Health
```bash
curl http://localhost:3001/api/health
```

### Test TEE Service Health
```bash
curl http://localhost:8080/health
```

### Submit Data for Analysis
```bash
curl -X POST http://localhost:3001/api/submit \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "customer_id": "TEST001",
        "age": 35,
        "income": 50000,
        "employment_status": "Employed",
        "credit_score": 700,
        "loan_amount": 10000,
        "loan_purpose": "Car Loan",
        "monthly_expenses": 2000,
        "transaction_volume": 25000,
        "account_balance": 10000,
        "delinquency_flag": false
      }
    ],
    "epsilon": 1.0
  }'
```

**Response:**
```json
{
  "jobId": "abc123...",
  "status": "pending"
}
```

### Get Job Results
```bash
# Replace JOB_ID with the jobId from previous response
curl http://localhost:3001/api/job/JOB_ID
```

### Verify Attestation
```bash
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "attestation": {
      "intel_quote": "...",
      "nonce": "...",
      "signature": "0x...",
      "signing_address": "0x...",
      "request_nonce": "..."
    },
    "result": { ... }
  }'
```

## Step 5: Test TEE Service Directly

### Health Check
```bash
curl http://localhost:8080/health
```

### Get Attestation Quote
```bash
curl http://localhost:8080/attestation
```

### Analyze Data Directly
```bash
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "data": "[{\"credit_score\": 700, \"income\": 50000, \"monthly_expenses\": 2000, \"loan_amount\": 10000, \"delinquency_flag\": false}]",
    "epsilon": 1.0
  }'
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

**Backend (3001):**
```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9
```

**Frontend (3000):**
```bash
lsof -ti:3000 | xargs kill -9
```

**TEE Service (8080):**
```bash
lsof -ti:8080 | xargs kill -9
```

### TEE Service Not Starting

If Python errors occur:
```bash
# Check Python version
python --version  # Should be 3.10+

# Install missing dependencies
pip install -r requirements.txt
```

### Backend Can't Connect to TEE Service

Check that:
1. TEE service is running on port 8080
2. Backend `TEE_SERVICE_URL` is correct (default: http://localhost:8080)
3. No firewall blocking localhost connections

### Frontend Can't Connect to Backend

Check that:
1. Backend is running on port 3001
2. Frontend `NEXT_PUBLIC_API_URL` is correct (default: http://localhost:3001)
3. CORS is enabled (should be by default)

## Expected Results

### Successful Analysis
- Risk metrics should show values between 0-100%
- Privacy budget should show epsilon value
- Attestation should include signing address and signature

### Simulation Mode (No TEE Hardware)
- TDX quote verification will fail (expected)
- Signature verification will still work
- Overall verification may be false (expected)

### With TEE Hardware
- All verifications should pass
- TDX quote should be verified by Phala
- Report data binding should succeed

## Next Steps

- Try different epsilon values (0.1, 1.0, 10.0) to see privacy/accuracy trade-off
- Upload larger datasets
- Test with different financial data formats
- Review the results and attestation details

## Quick Commands Summary

```bash
# Terminal 1: TEE Service
cd tee_service && python enclave_entry.py

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev

# Test
curl http://localhost:3001/api/health
curl http://localhost:8080/health
# Open http://localhost:3000 in browser
```

