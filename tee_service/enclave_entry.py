"""
Enclave Entry Point for Confidential Analytics

USE CASE: Multi-Bank Loan Default Risk Analysis
===============================================

Real-World Problem:
Multiple banks (Bank A, B, C) want to understand industry-wide loan default trends
but cannot share customer data due to:
- Privacy regulations (GDPR, CCPA)
- Competitive concerns
- Data breach risks

Solution:
1. Each bank encrypts and submits customer loan data to TEE
2. TEE decrypts data inside secure enclave (hardware-isolated)
3. Calculates aggregate risk metrics (mean, median, high/low risk %)
4. Applies Differential Privacy to prevent reverse-engineering
5. Returns privacy-protected insights + cryptographic attestation

What We Analyze:
- Loan default probability across customer segments
- Risk distribution: mean risk, median risk, high-risk %, low-risk %
- Industry trends without exposing individual bank data
- Protected by ε-differential privacy (mathematical guarantee)

This service handles:
- Decrypting encrypted financial data inside the enclave
- Running realistic risk scoring analytics (FICO-style)
- Applying Differential Privacy with configurable epsilon
- Generating attestation proofs (TDX quote + signature)
"""

import json
import os
import base64
import sys
import re
from typing import Dict, Any, Optional

# Print startup info for debugging
print("🔍 Starting TEE Analytics Service...", file=sys.stderr)
print(f"📦 Python: {sys.version}", file=sys.stderr)
print(f"📁 CWD: {os.getcwd()}", file=sys.stderr)

try:
    from flask import Flask, request, jsonify
    print("✅ Flask imported", file=sys.stderr)
except ImportError as e:
    print(f"❌ Flask import error: {e}", file=sys.stderr)
    raise

try:
    from cryptography.fernet import Fernet
    print("✅ Fernet imported", file=sys.stderr)
except ImportError as e:
    print(f"❌ Fernet import error: {e}", file=sys.stderr)
    raise

try:
    from dstack_sdk import DstackClient
    print("✅ DstackClient imported", file=sys.stderr)
except ImportError as e:
    print(f"⚠️  DstackClient import warning: {e}", file=sys.stderr)
    DstackClient = None

try:
    import web3
    from eth_account.messages import encode_defunct
    print("✅ web3 imported", file=sys.stderr)
except ImportError as e:
    print(f"❌ web3 import error: {e}", file=sys.stderr)
    raise

try:
    from risk_model import calculate_aggregate_risk_scores
    print("✅ risk_model imported", file=sys.stderr)
except ImportError as e:
    print(f"❌ risk_model import error: {e}", file=sys.stderr)
    raise

try:
    from dp_logic import apply_dp_to_risk_metrics, calculate_privacy_budget
    print("✅ dp_logic imported", file=sys.stderr)
except ImportError as e:
    print(f"❌ dp_logic import error: {e}", file=sys.stderr)
    raise

app = Flask(__name__)

# Initialize TEE client for attestation
tee_client: Optional[DstackClient] = None
signing_account = None

# Default privacy budget (can be configured via env)
# Increased default to 2.0 for better accuracy when split across many queries
# With 20 queries, epsilon=2.0 gives 0.1 per query (reasonable accuracy)
# epsilon=1.0 gives 0.05 per query (too noisy, causes 20%+ errors)
DEFAULT_EPSILON = float(os.getenv("DP_EPSILON", "2.0"))


def init_tee_context():
    """Initialize TEE context and signing keys."""
    global tee_client, signing_account
    
    print("🔧 Initializing TEE context...", file=sys.stderr)
    
    try:
        if DstackClient is not None:
            tee_client = DstackClient()
            print("✅ DstackClient created", file=sys.stderr)
        else:
            tee_client = None
            print("⚠️  DstackClient not available", file=sys.stderr)
    except Exception as e:
        print(f"⚠️  TEE client initialization failed (may be in simulation mode): {e}", file=sys.stderr)
        tee_client = None
    
    # Create Ethereum account for signing results
    try:
        w3 = web3.Web3()
        signing_account = w3.eth.account.create()
        print(f"✅ Signing account created: {signing_account.address}", file=sys.stderr)
    except Exception as e:
        print(f"❌ Failed to create signing account: {e}", file=sys.stderr)
        raise


def decrypt_data(encrypted_data: str, key: Optional[str] = None) -> Dict[str, Any]:
    """
    Decrypt Fernet-encrypted data inside the enclave.
    
    Security: Data is encrypted in transit and only decrypted inside the secure enclave.
    The encryption key is sent with the request but is only used inside hardware-isolated TEE.
    
    In production, keys would come from KMS (Key Management Service) for better key management.
    For MVP, the key is sent with the encrypted data (still secure because TEE is isolated).
    
    Args:
        encrypted_data: Fernet-encrypted token (base64url encoded string)
        key: Fernet key (base64url encoded string from Node.js)
    
    Returns:
        Decrypted data as dict/list
    """
    if key is None:
        raise ValueError("Decryption key required - data must be encrypted")
    
    if not isinstance(encrypted_data, str):
        raise ValueError(f"Encrypted data must be a string, got {type(encrypted_data)}")
    
    try:
        # Fernet key from Node.js is base64url encoded string (no padding, - and _ instead of + and /)
        # Python Fernet requires base64-encoded key (with padding, + and /)
        # Convert base64url to base64
        if not isinstance(key, str):
            key = key.decode('utf-8') if isinstance(key, bytes) else str(key)
        
        # Convert base64url to base64: replace - with +, _ with /, and add padding
        base64_key = key.replace('-', '+').replace('_', '/')
        # Add padding if needed (base64 requires length to be multiple of 4)
        padding = len(base64_key) % 4
        if padding:
            base64_key += '=' * (4 - padding)
        
        # Python Fernet requires base64-encoded key (32 bytes = 44 base64 chars with padding)
        f = Fernet(base64_key)
        decrypted_bytes = f.decrypt(encrypted_data.encode('utf-8'))
        return json.loads(decrypted_bytes.decode('utf-8'))
    except Exception as e:
        raise ValueError(f"Decryption failed: {e}. Ensure data is Fernet-encrypted and key is correct.")


def process_analytics(data: Dict[str, Any], epsilon: float = DEFAULT_EPSILON) -> Dict[str, Any]:
    """
    Process multi-bank loan data through risk scoring and Differential Privacy.
    
    USE CASE: Multiple banks submit encrypted customer loan data, receive aggregate
    risk metrics (mean, median, high/low risk %) with Differential Privacy protection.
    
    Process:
    1. Extract customer records from multiple banks
    2. Calculate individual risk scores (FICO-style algorithm)
    3. Aggregate metrics: mean, median, high/low risk percentages
    4. Apply Differential Privacy noise to protect individual data
    5. Return privacy-protected aggregate metrics
    
    Privacy Guarantee: ε-differential privacy ensures that adding or removing
    any single customer's data changes the output by at most ε.
    """
    # Extract customer records
    if isinstance(data, list):
        customers = data
    elif isinstance(data, dict) and "customers" in data:
        customers = data["customers"]
    else:
        customers = [data]  # Single customer
    
    # Calculate raw risk metrics
    raw_metrics = calculate_aggregate_risk_scores(customers)
    
    # Apply Differential Privacy (splits epsilon across all queries)
    # Use Laplace mechanism for data analytics/release (better for one-off statistics)
    # For ML/training scenarios, use Gaussian instead (see dp_logic.py comments)
    # Minimum epsilon protection prevents excessive noise
    # Include metadata for composition tracking
    dp_metrics = apply_dp_to_risk_metrics(raw_metrics, epsilon=epsilon, split_budget=True, use_gaussian=False, include_metadata=True)
    
    # Calculate privacy budget info (now correctly accounting for all queries)
    num_queries = dp_metrics.get("_num_queries", 1)
    epsilon_per_query = dp_metrics.get("_epsilon_per_query", epsilon)
    mechanism = dp_metrics.get("_mechanism", "laplace")
    privacy_info = calculate_privacy_budget(epsilon_per_query, num_queries=num_queries)
    privacy_info["mechanism"] = mechanism
    privacy_info["num_queries_released"] = num_queries
    
    # Remove metadata from output
    dp_metrics.pop("_num_queries", None)
    dp_metrics.pop("_epsilon_per_query", None)
    dp_metrics.pop("_mechanism", None)
    
    return {
        "risk_metrics": dp_metrics,
        "privacy_budget": privacy_info,
        "raw_metrics": raw_metrics  # NOTE: In production, remove raw_metrics to prevent privacy leakage
    }


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "tee_available": tee_client is not None
    })


@app.route("/attestation", methods=["GET"])
def get_attestation():
    """Get TEE attestation quote."""
    if tee_client is None:
        return jsonify({
            "error": "TEE not available (simulation mode)"
        }), 503
    
    try:
        # Generate attestation quote
        nonce = os.urandom(32).hex()
        quote_result = tee_client.get_quote(nonce.encode())
        
        return jsonify({
            "intel_quote": quote_result.quote,
            "nonce": nonce,
            "signing_address": signing_account.address if signing_account else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Main analytics endpoint for multi-bank loan default risk analysis.
    
    USE CASE: Banks submit encrypted customer loan data, receive aggregate
    risk metrics with Differential Privacy protection.
    
    Input: Customer loan data (Fernet-encrypted, key required)
    Output: 
    - Aggregate risk metrics (mean, median, high/low risk %)
    - Privacy budget information
    - TEE attestation (TDX quote + signature)
    
    Privacy: Results protected by ε-differential privacy - individual customer
    data cannot be reverse-engineered from the output.
    """
    try:
        # Get request data
        request_data = request.get_json()
        if not request_data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract encrypted data and decryption key (required)
        encrypted_data = request_data.get("data")
        encryption_key = request_data.get("key")  # Base64url encoded (from Node.js fernet)
        epsilon = float(request_data.get("epsilon", DEFAULT_EPSILON))
        
        if not encrypted_data:
            return jsonify({"error": "No data field provided"}), 400
        
        if not encryption_key:
            return jsonify({"error": "Encryption key required - data must be encrypted"}), 400
        
        # Decrypt data inside enclave
        decrypted_data = decrypt_data(encrypted_data, encryption_key)
        
        # Process analytics
        analytics_result = process_analytics(decrypted_data, epsilon=epsilon)
        
        # Generate attestation
        attestation_info = None
        if signing_account is not None:
            try:
                # Generate nonce first (needed for quote)
                nonce = os.urandom(32).hex()
                nonce_bytes = bytes.fromhex(nonce)
                
                # Build report data: [signing_address (32 bytes) || nonce (32 bytes)]
                # This binds the signing address to the TDX quote
                signing_address_bytes = bytes.fromhex(signing_account.address[2:])  # Remove '0x'
                report_data = signing_address_bytes.ljust(32, b"\x00") + nonce_bytes
                
                # Get TEE quote with report data binding
                quote_result = None
                intel_quote = None
                if tee_client is not None:
                    try:
                        quote_result = tee_client.get_quote(report_data)
                        intel_quote = quote_result.quote
                    except Exception as e:
                        print(f"TEE quote generation failed: {e}")
                        # Continue without quote in simulation mode
                
                # Create a signature over the result
                # IMPORTANT: Must match exactly what Node.js verifier reconstructs
                # Node.js recursively sorts ALL nested object keys, not just top-level
                # Python's json.dumps(sort_keys=True) only sorts top-level keys!
                # We need to recursively sort all nested objects to match Node.js
                def sort_keys_recursively(obj):
                    """Recursively sort all dictionary keys (matches Node.js behavior)."""
                    if obj is None or not isinstance(obj, (dict, list)):
                        return obj
                    if isinstance(obj, list):
                        return [sort_keys_recursively(item) for item in obj]
                    if isinstance(obj, dict):
                        return {k: sort_keys_recursively(v) for k, v in sorted(obj.items())}
                    return obj
                
                def normalize_numbers(obj):
                    """
                    Normalize numbers to match JavaScript JSON.stringify format:
                    - Convert 6.0 to 6 (remove .0 for integers)
                    - Keep floats as-is (JavaScript will format them correctly)
                    """
                    if obj is None:
                        return None
                    if isinstance(obj, bool):
                        return obj
                    if isinstance(obj, (int, float)):
                        # If it's a float that's actually an integer (e.g., 6.0), convert to int
                        # This ensures Python outputs "6" instead of "6.0"
                        if isinstance(obj, float) and obj.is_integer():
                            return int(obj)
                        return obj
                    if isinstance(obj, list):
                        return [normalize_numbers(item) for item in obj]
                    if isinstance(obj, dict):
                        return {k: normalize_numbers(v) for k, v in obj.items()}
                    return obj
                
                sorted_result = sort_keys_recursively(analytics_result)
                normalized_result = normalize_numbers(sorted_result)
                
                # Serialize to JSON
                result_json = json.dumps(normalized_result, sort_keys=True, separators=(',', ':'))
                
                # Post-process to fix scientific notation (Python uses 1e-05, JavaScript uses 0.00001)
                # Replace scientific notation with decimal notation for small numbers
                def replace_scientific(match):
                    num = float(match.group(0))
                    # Format as decimal with enough precision
                    formatted = f"{num:.15f}".rstrip('0').rstrip('.')
                    return formatted
                
                # Match scientific notation: 1e-05, 1e+05, etc.
                result_json = re.sub(r'\d+\.?\d*[eE][+-]?\d+', replace_scientific, result_json)
                
                # Debug: Log what we're signing (first 200 chars)
                print(f"🔐 Signing message (first 200 chars): {result_json[:200]}...", file=sys.stderr)
                print(f"🔐 Signing address: {signing_account.address}", file=sys.stderr)
                print(f"🔐 Message length: {len(result_json)}", file=sys.stderr)
                
                signed_message = signing_account.sign_message(encode_defunct(text=result_json))
                
                # Debug: Log signature
                print(f"🔐 Signature: {signed_message.signature.hex()[:20]}...", file=sys.stderr)
                
                attestation_info = {
                    "intel_quote": intel_quote,
                    "nonce": nonce,
                    "signature": signed_message.signature.hex(),
                    "signing_address": signing_account.address,
                    "signing_algo": "ecdsa",
                    "result_hash": web3.Web3.keccak(text=result_json).hex(),
                    "request_nonce": nonce,  # Same as nonce for this implementation
                    "message_preview": result_json[:200]  # Debug: first 200 chars of signed message
                }
            except Exception as e:
                print(f"Attestation generation failed: {e}")
                attestation_info = {"error": str(e)}
        
        return jsonify({
            "result": analytics_result,
            "attestation": attestation_info,
            "processed_at": os.environ.get("TEE_TIMESTAMP", "unknown")
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("=" * 60, file=sys.stderr)
    print("🚀 TEE Analytics Service Starting", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    # Initialize TEE context
    try:
        init_tee_context()
        print("✅ TEE context initialized", file=sys.stderr)
    except Exception as e:
        print(f"❌ TEE initialization failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    
    # Run Flask app
    port = int(os.getenv("PORT", 8080))
    print(f"🌐 Starting Flask server on 0.0.0.0:{port}", file=sys.stderr)
    print("📡 Available endpoints: /health, /analyze, /attestation", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    try:
        app.run(host="0.0.0.0", port=port, debug=False)
    except Exception as e:
        print(f"❌ Flask startup error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

