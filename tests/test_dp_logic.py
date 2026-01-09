"""
Tests for Differential Privacy logic
"""

import pytest
import sys
import os

# Add parent directory to path to import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tee_service'))

from dp_logic import add_laplace_noise, add_gaussian_noise, apply_dp_to_risk_metrics, calculate_privacy_budget


def test_add_laplace_noise():
    """Test Laplace noise addition"""
    value = 0.5
    epsilon = 1.0
    sensitivity = 1.0
    
    noisy_value = add_laplace_noise(value, epsilon, sensitivity)
    
    # Noise should be added, but value should still be in reasonable range
    assert -10 <= noisy_value <= 10  # Very wide range for noise


def test_apply_dp_to_risk_metrics():
    """Test DP application to risk metrics"""
    metrics = {
        "mean_risk": 0.5,
        "median_risk": 0.45,
        "high_risk_percentage": 30.0,
        "low_risk_percentage": 40.0,
        "total_customers": 100,
        "std_risk": 0.2
    }
    
    dp_metrics = apply_dp_to_risk_metrics(metrics, epsilon=1.0)
    
    assert "mean_risk" in dp_metrics
    assert "median_risk" in dp_metrics
    assert "high_risk_percentage" in dp_metrics
    assert "low_risk_percentage" in dp_metrics
    assert "total_customers" in dp_metrics
    
    # Values should be in valid ranges
    assert 0 <= dp_metrics["mean_risk"] <= 1
    assert 0 <= dp_metrics["median_risk"] <= 1
    assert 0 <= dp_metrics["high_risk_percentage"] <= 100
    assert 0 <= dp_metrics["low_risk_percentage"] <= 100


def test_add_gaussian_noise():
    """Test Gaussian noise addition"""
    value = 0.5
    epsilon = 1.0
    delta = 1e-5
    sensitivity = 1.0
    
    noisy_value = add_gaussian_noise(value, epsilon, delta, sensitivity)
    
    # Noise should be added, but value should still be in reasonable range
    assert -10 <= noisy_value <= 10  # Very wide range for noise


def test_apply_dp_with_gaussian():
    """Test DP application with Gaussian mechanism"""
    metrics = {
        "mean_risk": 0.5,
        "median_risk": 0.45,
        "high_risk_percentage": 30.0,
        "low_risk_percentage": 40.0,
        "total_customers": 100,
        "std_risk": 0.2
    }
    
    # Force Gaussian mechanism
    dp_metrics = apply_dp_to_risk_metrics(metrics, epsilon=1.0, use_gaussian=True)
    
    assert "mean_risk" in dp_metrics
    assert "median_risk" in dp_metrics
    assert "high_risk_percentage" in dp_metrics
    assert "low_risk_percentage" in dp_metrics
    assert "total_customers" in dp_metrics
    
    # Values should be in valid ranges
    assert 0 <= dp_metrics["mean_risk"] <= 1
    assert 0 <= dp_metrics["median_risk"] <= 1
    assert 0 <= dp_metrics["high_risk_percentage"] <= 100
    assert 0 <= dp_metrics["low_risk_percentage"] <= 100


def test_calculate_privacy_budget():
    """Test privacy budget calculation"""
    budget = calculate_privacy_budget(epsilon_per_query=1.0, num_queries=5)
    
    assert "epsilon_per_query" in budget
    assert "num_queries" in budget
    assert "total_epsilon_simple" in budget
    assert "total_epsilon_advanced" in budget
    assert budget["total_epsilon_simple"] == 5.0

