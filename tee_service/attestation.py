"""
Attestation Utilities

Helper functions for generating and verifying TEE attestation proofs.
"""

import json
import os
from typing import Dict, Any, Optional
from dstack_sdk import DstackClient
import web3
from eth_account.messages import encode_defunct


def generate_attestation(nonce: Optional[bytes] = None) -> Dict[str, Any]:
    """
    Generate TEE attestation quote.
    
    Returns Intel TDX quote and related attestation data.
    """
    client = DstackClient()
    
    if nonce is None:
        nonce = os.urandom(32)
    
    quote_result = client.get_quote(nonce)
    
    return {
        "intel_quote": quote_result.quote,
        "nonce": nonce.hex() if isinstance(nonce, bytes) else nonce,
        "event_log": json.loads(quote_result.event_log) if quote_result.event_log else None
    }


def sign_result(result: Dict[str, Any], account) -> str:
    """
    Sign a result dictionary with an Ethereum account.
    
    Returns hex-encoded signature.
    """
    result_json = json.dumps(result, sort_keys=True)
    signed_message = account.sign_message(encode_defunct(text=result_json))
    return signed_message.signature.hex()


def verify_signature(result: Dict[str, Any], signature: str, address: str) -> bool:
    """
    Verify a signature on a result.
    
    This would typically be called by the backend or frontend to verify
    that results came from a trusted enclave.
    """
    result_json = json.dumps(result, sort_keys=True)
    message_hash = web3.Web3.keccak(text=result_json)
    
    try:
        w3 = web3.Web3()
        recovered_address = w3.eth.account.recover_message(
            encode_defunct(text=result_json),
            signature=signature
        )
        return recovered_address.lower() == address.lower()
    except Exception:
        return False

