#!/bin/bash
# Quick API test script

echo "🔍 Testing Backend Health..."
curl -s http://localhost:3001/api/health | jq '.' || echo "Backend not running"

echo -e "\n🔍 Testing TEE Service Health..."
curl -s http://localhost:8080/health | jq '.' || echo "TEE Service not running"

echo -e "\n📊 Submitting test data..."
JOB_RESPONSE=$(curl -s -X POST http://localhost:3001/api/submit \
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
  }')

echo "$JOB_RESPONSE" | jq '.'

JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.jobId')

if [ "$JOB_ID" != "null" ] && [ -n "$JOB_ID" ]; then
  echo -e "\n⏳ Waiting 3 seconds for processing..."
  sleep 3
  
  echo -e "\n📈 Getting job results..."
  curl -s "http://localhost:3001/api/job/$JOB_ID" | jq '.'
else
  echo "Failed to get job ID"
fi

