const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const fernet = require('fernet');
const { verifyAttestation } = require('./verifier');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// TEE service URL (can be local simulation or Phala Network)
// Set via environment variable TEE_URL in .env file:
// - Local: TEE_URL=http://localhost:8080
// - Phala: TEE_URL=https://your-app-id.phala.network
const TEE_SERVICE_URL = process.env.TEE_URL || 'http://localhost:8080';

// Debug: Log TEE URL on startup
if (!process.env.TEE_URL) {
  console.warn('⚠️  TEE_URL not set in .env file, using default: http://localhost:8080');
  console.warn('   Create backend/.env with: TEE_URL=https://your-phala-url.phala.network');
} else {
  console.log(`✅ TEE_URL loaded from .env: ${TEE_SERVICE_URL}`);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory job queue (in production, use Redis or similar)
const jobQueue = [];
const jobResults = new Map();

/**
 * Generate a Fernet encryption key and encrypt data
 * In production, keys would come from KMS (Key Management Service)
 * For MVP, we generate a key per request and send it with encrypted data
 * The key is only used inside the TEE (hardware-isolated), so it's secure
 */
function encryptDataForTEE(data) {
  // Generate a random 32-byte key and encode as base64url
  const keyBytes = crypto.randomBytes(32);
  // Fernet uses URL-safe base64 encoding
  const keyBase64 = keyBytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Generate random IV (16 bytes as array of integers)
  const ivBytes = crypto.randomBytes(16);
  const iv = Array.from(ivBytes);
  
  // Create Fernet secret and token
  const secret = new fernet.Secret(keyBase64);
  const token = new fernet.Token({
    secret: secret,
    time: Date.now(),
    iv: iv
  });
  
  // Encrypt the data
  const encrypted = token.encode(JSON.stringify(data));
  
  return {
    encryptedData: encrypted,
    encryptionKey: keyBase64 // Base64url encoded key
  };
}

/**
 * POST /api/submit
 * Accepts financial data, encrypts it, and sends to TEE service
 */
app.post('/api/submit', async (req, res) => {
  try {
    const { data, epsilon } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    // Log request for debugging
    console.log(`📥 Received submission: ${data.length} records, epsilon=${epsilon}`);
    console.log(`🔗 TEE URL: ${TEE_SERVICE_URL}`);

    // Encrypt data before sending to TEE
    // The encryption key is sent with the data, but it's only used inside the TEE
    // In production, keys would come from KMS (Key Management Service)
    const { encryptedData, encryptionKey } = encryptDataForTEE(data);

    // Create job
    const jobId = crypto.randomBytes(16).toString('hex');
    const job = {
      id: jobId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      epsilon: epsilon || 1.0
    };

    jobQueue.push(job);
    jobResults.set(jobId, job);

    // Process job asynchronously with encrypted data
    processJob(jobId, encryptedData, encryptionKey, epsilon || 1.0)
      .catch(error => {
        console.error(`Job ${jobId} failed:`, error);
        const job = jobResults.get(jobId);
        if (job) {
          job.status = 'failed';
          const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
          job.error = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
        }
      });

    res.json({
      jobId,
      status: 'pending',
      message: 'Job submitted successfully'
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process a job by sending encrypted data to TEE service
 */
async function processJob(jobId, encryptedData, encryptionKey, epsilon) {
  const job = jobResults.get(jobId);
  if (!job) return;

  try {
    job.status = 'processing';
    
    // Send encrypted data to TEE service
    // The encryption key is sent with the data, but only used inside the TEE
    // Data is encrypted in transit and only decrypted inside the secure enclave
    const requestPayload = {
      data: encryptedData,  // Fernet-encrypted data
      key: encryptionKey,  // Base64url-encoded Fernet key
      epsilon: epsilon
    };
    
    console.log(`📤 Sending request to TEE: ${TEE_SERVICE_URL}/analyze`);
    
    // Extract hostname for SNI (Server Name Indication)
    const urlObj = new URL(TEE_SERVICE_URL);
    const hostname = urlObj.hostname;
    
    // First, test connectivity with /health endpoint
    try {
      console.log(`🔍 Testing connectivity with /health endpoint...`);
      const healthAgent = new https.Agent({
        keepAlive: false,
        rejectUnauthorized: true,
        servername: hostname,
        maxSockets: 1,
        timeout: 10000
      });
      
      const healthCheck = await axios.get(`${TEE_SERVICE_URL}/health`, {
        timeout: 10000,
        httpsAgent: healthAgent,
        maxRedirects: 0
      });
      console.log(`✅ Health check successful:`, healthCheck.data);
    } catch (healthError) {
      console.error(`❌ Health check failed:`, healthError.code || healthError.message);
      // Continue anyway - might be a transient issue
    }
    
    // Retry logic for TLS connection issues
    let lastError;
    const maxRetries = 5; // Increased retries
    let response;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create HTTPS agent with SNI explicitly set
        // Use a fresh agent for each attempt to avoid connection reuse issues
        const httpsAgent = new https.Agent({
          keepAlive: false, // Disable keep-alive to avoid connection reuse issues
          rejectUnauthorized: true,
          servername: hostname, // CRITICAL: Set SNI for Phala gateway
          maxSockets: 1,
          timeout: 30000 // Connection timeout
        });
        
        console.log(`🔄 Attempt ${attempt}/${maxRetries} to ${TEE_SERVICE_URL}/analyze`);
        
        // Remove Host header - let axios/Node.js handle it automatically
        // Setting Host manually can cause TLS/SNI issues
        response = await axios.post(`${TEE_SERVICE_URL}/analyze`, requestPayload, {
          timeout: 120000, // 120 second timeout
          httpsAgent: httpsAgent,
          headers: {
            'Content-Type': 'application/json'
          },
          maxRedirects: 0,
          validateStatus: (status) => status < 500,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
        console.log(`✅ Request successful on attempt ${attempt}`);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        const errorCode = error.code || error.response?.status || 'UNKNOWN';
        const errorMsg = error.message || 'Unknown error';
        console.error(`⚠️  Attempt ${attempt}/${maxRetries} failed:`, errorCode, errorMsg);
        
        if (attempt < maxRetries) {
          const delay = Math.min(2000 * attempt, 10000); // Progressive delay: 2s, 4s, 6s, 8s, 10s
          console.log(`   Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`❌ All ${maxRetries} attempts failed. Last error:`, errorCode, errorMsg);
          throw error;
        }
      }
    }

    // Store result
    job.status = 'completed';
    job.result = response.data.result;
    job.attestation = response.data.attestation;
    job.completedAt = new Date().toISOString();

      } catch (error) {
        console.error(`Job ${jobId} processing error:`, error);
        console.error(`TEE URL used: ${TEE_SERVICE_URL}`);
        if (error.response) {
          console.error(`TEE response status: ${error.response.status}`);
          console.error(`TEE response data:`, error.response.data);
        }
        job.status = 'failed';
        const errorMsg = error.response?.data?.error || error.response?.data || error.message;
        job.error = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
      }
}

/**
 * GET /api/job/:jobId
 * Get job status and results
 */
app.get('/api/job/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobResults.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

/**
 * GET /api/attestation
 * Get TEE attestation quote
 */
app.get('/api/attestation', async (req, res) => {
  try {
    const response = await axios.get(`${TEE_SERVICE_URL}/attestation`);
    res.json(response.data);
  } catch (error) {
    console.error('Attestation error:', error);
    res.status(500).json({ 
      error: error.response?.data?.error || error.message 
    });
  }
});

/**
 * POST /api/verify
 * Verify attestation comprehensively (TDX quote + report data + signature)
 */
app.post('/api/verify', async (req, res) => {
  try {
    const { attestation, result, requestNonce } = req.body;

    if (!attestation || !result) {
      return res.status(400).json({ error: 'Missing attestation or result' });
    }

    // Debug logging
    console.log('Verification request:', {
      hasAttestation: !!attestation,
      hasResult: !!result,
      resultKeys: Object.keys(result || {}),
      signature: attestation?.signature?.substring(0, 20) + '...',
      signatureLength: attestation?.signature?.length,
      signingAddress: attestation?.signing_address,
      hasRiskMetrics: !!result?.risk_metrics,
      hasPrivacyBudget: !!result?.privacy_budget
    });

    // Perform comprehensive verification
    const verificationResults = await verifyAttestation(
      attestation,
      result,
      requestNonce || attestation.nonce
    );

    res.json({
      verified: verificationResults.overall,
      details: verificationResults,
      message: verificationResults.overall
        ? 'Attestation verified successfully'
        : 'Attestation verification failed - see details'
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', async (req, res) => {
  try {
    // Check TEE service health
    const teeHealth = await axios.get(`${TEE_SERVICE_URL}/health`)
      .then(r => r.data)
      .catch(() => ({ status: 'unavailable' }));

    res.json({
      status: 'healthy',
      tee_service: teeHealth
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
  console.log(`TEE URL: ${TEE_SERVICE_URL}`);
  console.log(`Mode: ${TEE_SERVICE_URL.includes('localhost') ? 'LOCAL' : 'PHALA CLOUD'}`);
});

