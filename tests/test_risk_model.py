"""
Tests for risk scoring model
"""

import pytest
import sys
import os

# Add parent directory to path to import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tee_service'))

from risk_model import calculate_risk_score, calculate_aggregate_risk_scores


def test_calculate_risk_score_low_risk():
    """Test risk score calculation for low-risk customer"""
    customer = {
        "credit_score": 750,
        "income": 100000,
        "monthly_expenses": 3000,
        "loan_amount": 20000,
        "delinquency_flag": False
    }
    score = calculate_risk_score(customer)
    assert 0 <= score <= 1
    assert score < 0.5  # Should be low risk


def test_calculate_risk_score_high_risk():
    """Test risk score calculation for high-risk customer"""
    customer = {
        "credit_score": 550,
        "income": 30000,
        "monthly_expenses": 2500,
        "loan_amount": 15000,
        "delinquency_flag": True
    }
    score = calculate_risk_score(customer)
    assert 0 <= score <= 1
    assert score > 0.5  # Should be high risk


def test_calculate_aggregate_risk_scores():
    """Test aggregate risk score calculation"""
    customers = [
        {
            "credit_score": 750,
            "income": 100000,
            "monthly_expenses": 3000,
            "loan_amount": 20000,
            "delinquency_flag": False
        },
        {
            "credit_score": 550,
            "income": 30000,
            "monthly_expenses": 2500,
            "loan_amount": 15000,
            "delinquency_flag": True
        }
    ]
    metrics = calculate_aggregate_risk_scores(customers)
    
    assert "mean_risk" in metrics
    assert "median_risk" in metrics
    assert "high_risk_percentage" in metrics
    assert "low_risk_percentage" in metrics
    assert "total_customers" in metrics
    assert metrics["total_customers"] == 2


def test_empty_customers():
    """Test with empty customer list"""
    metrics = calculate_aggregate_risk_scores([])
    assert metrics["total_customers"] == 0
    assert metrics["mean_risk"] == 0.0

