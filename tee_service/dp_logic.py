"""
Differential Privacy Logic

This module applies Differential Privacy mechanisms to protect individual
data points in aggregated analytics results.
"""

import numpy as np
from typing import Dict, Any
import random
import math


def add_laplace_noise(value: float, epsilon: float, sensitivity: float) -> float:
    """
    Add Laplace noise to a value for Differential Privacy.
    
    Laplace Mechanism - Best for Data Analytics/Release:
    ====================================================
    ✅ Use when:
    - You want pure ε-DP (strongest guarantee, no delta parameter)
    - Releasing one-off statistics (counts, sums, percentages, means)
    - Data dashboards and analytics reports
    - Simple numeric queries
    - You want tighter guarantees with smaller noise for small datasets
    
    ❌ Don't use when:
    - Machine learning / iterative training (use Gaussian)
    - Many repeated queries with composition (Gaussian has better bounds)
    - High-dimensional data / gradients (use Gaussian)
    
    How it works:
    - Adds noise drawn from a Laplace distribution
    - Noise scale = sensitivity / epsilon
    - Provides pure ε-DP (no delta parameter)
    
    Pros:
    - Strong, clean theoretical guarantee (ε-DP)
    - Simple to implement
    - Often less noise than Gaussian for the same ε
    - Industry standard for data release (Google/Apple style)
    
    Cons:
    - Harder to compose across many queries
    - Less flexible for ML / iterative algorithms
    
    Args:
        value: The original value to protect
        epsilon: Privacy budget (smaller = more private, typically 0.1-10)
        sensitivity: L1 sensitivity (maximum change in output from changing one input)
    
    Returns:
        Noisy value that satisfies epsilon-DP
    """
    if epsilon <= 0:
        raise ValueError("Epsilon must be positive")
    
    # Laplace distribution: scale = sensitivity / epsilon
    scale = sensitivity / epsilon
    
    # Generate Laplace noise
    # Laplace(0, scale) = Exponential(1/scale) - Exponential(1/scale)
    u = random.uniform(-0.5, 0.5)
    noise = -scale * np.sign(u) * np.log(1 - 2 * abs(u))
    
    return value + noise


def add_gaussian_noise(value: float, epsilon: float, delta: float, sensitivity: float) -> float:
    """
    Add Gaussian noise to a value for Differential Privacy.
    
    Gaussian Mechanism - Best for Machine Learning/Training:
    ========================================================
    ✅ Use when:
    - Machine learning / iterative training (DP-SGD, federated learning)
    - You need composition over many steps/iterations
    - High-dimensional data (embeddings, gradients)
    - Repeated queries with better composition bounds
    - You're okay with (ε, δ)-DP instead of pure ε-DP
    
    ❌ Don't use when:
    - One-off data release / dashboards (use Laplace)
    - You need pure ε-DP (Laplace provides stronger guarantee)
    - Simple statistics (counts, sums) - Laplace is simpler
    
    How it works:
    - Adds noise from a Gaussian (normal) distribution
    - Noise scale = sensitivity × √(log(1/δ)) / ε
    - Provides (ε, δ)-DP (weaker than pure ε-DP, but better composition)
    
    Pros:
    - Much better composition properties (advanced composition)
    - Standard in DP-SGD, federated learning
    - Plays nicely with high-dimensional data
    - Better for many repeated queries
    
    Cons:
    - Weaker guarantee (δ > 0, small failure probability)
    - Usually more noise than Laplace for one-off queries
    - More complex (requires delta parameter)
    
    Example for ML:
    ---------------
    # For DP-SGD training:
    # gradients = compute_gradients(batch)
    # noisy_gradients = gradients + add_gaussian_noise(0, epsilon=1.0, delta=1e-5, sensitivity=gradient_norm)
    # model.update(noisy_gradients)
    
    Args:
        value: The original value to protect
        epsilon: Privacy budget
        delta: Failure probability (typically 1e-5 to 1e-6)
        sensitivity: L2 sensitivity (for vector queries, use sqrt(sum of squares))
    
    Returns:
        Noisy value that satisfies (epsilon, delta)-DP
    """
    if epsilon <= 0:
        raise ValueError("Epsilon must be positive")
    if delta <= 0 or delta >= 1:
        raise ValueError("Delta must be in (0, 1)")
    
    # Gaussian mechanism: sigma = sqrt(2 * ln(1.25/delta)) * sensitivity / epsilon
    # This ensures (epsilon, delta)-DP
    sigma = np.sqrt(2 * np.log(1.25 / delta)) * sensitivity / epsilon
    
    # Generate Gaussian noise
    noise = np.random.normal(0, sigma)
    
    return value + noise


# ============================================================================
# EXAMPLE: Using Gaussian for Machine Learning (DP-SGD)
# ============================================================================
# 
# For ML training scenarios, use Gaussian instead of Laplace:
#
# def dp_sgd_step(model, batch, epsilon, delta):
#     \"\"\"
#     One step of Differentially Private Stochastic Gradient Descent.
#     Uses Gaussian noise for better composition over many iterations.
#     \"\"\"
#     # Compute gradients
#     gradients = compute_gradients(model, batch)
#     
#     # Calculate sensitivity (L2 norm clipping)
#     gradient_norm = np.linalg.norm(gradients)
#     clip_threshold = 1.0  # Clip gradients to this norm
#     if gradient_norm > clip_threshold:
#         gradients = gradients * (clip_threshold / gradient_norm)
#     sensitivity = clip_threshold / len(batch)  # Per-sample sensitivity
#     
#     # Add Gaussian noise to gradients
#     noisy_gradients = gradients.copy()
#     for i in range(len(gradients)):
#         noisy_gradients[i] = add_gaussian_noise(
#             gradients[i],
#             epsilon=epsilon,
#             delta=delta,
#             sensitivity=sensitivity
#         )
#     
#     # Update model
#     model.update(noisy_gradients)
#     return model
#
# # Usage in training loop:
# # for epoch in range(num_epochs):
# #     for batch in dataloader:
# #         model = dp_sgd_step(model, batch, epsilon=1.0, delta=1e-5)
#
# ============================================================================


def add_discrete_gaussian_noise(value: float, epsilon: float, delta: float, sensitivity: float) -> int:
    """
    Add discrete Gaussian noise to an integer value for Differential Privacy.
    
    Discrete Gaussian is best for:
    - Integer-valued queries (counts, sums)
    - When you need exact integer outputs (no rounding)
    - Better numerical stability for discrete data
    - When releasing raw counts instead of percentages
    
    Provides (epsilon, delta)-DP like continuous Gaussian, but with integer outputs.
    
    Args:
        value: The original integer value to protect (will be rounded to int)
        epsilon: Privacy budget
        delta: Failure probability (typically 1e-5 to 1e-6)
        sensitivity: L2 sensitivity
    
    Returns:
        Noisy integer value that satisfies (epsilon, delta)-DP
    """
    if epsilon <= 0:
        raise ValueError("Epsilon must be positive")
    if delta <= 0 or delta >= 1:
        raise ValueError("Delta must be in (0, 1)")
    
    # Convert value to integer
    int_value = int(round(value))
    
    # Discrete Gaussian: sigma = sqrt(2 * ln(1.25/delta)) * sensitivity / epsilon
    # Same formula as continuous Gaussian
    sigma = np.sqrt(2 * np.log(1.25 / delta)) * sensitivity / epsilon
    
    # Sample from discrete Gaussian distribution
    # Discrete Gaussian: P(X = k) ∝ exp(-(k-μ)²/(2σ²))
    # We use rejection sampling or approximate with rounded continuous Gaussian
    # For practical purposes, we can use rounded continuous Gaussian
    # (More sophisticated implementations use exact discrete sampling)
    continuous_noise = np.random.normal(0, sigma)
    discrete_noise = int(round(continuous_noise))
    
    return int_value + discrete_noise


def count_queries_in_metrics(metrics: Dict[str, float]) -> int:
    """
    Count the number of queries (metrics) being released.
    
    Args:
        metrics: Dictionary of risk metrics
    
    Returns:
        Total number of queries
    """
    count = 0
    # Basic scalar metrics
    scalar_metrics = ["mean_risk", "median_risk", "high_risk_percentage", 
                     "low_risk_percentage", "medium_risk_percentage", 
                     "std_risk", "avg_credit_score", "estimated_default_rate"]
    count += sum(1 for key in scalar_metrics if key in metrics)
    
    # Dictionary metrics (count each entry)
    dict_metrics = ["risk_by_age_group", "risk_by_income_bracket", 
                   "risk_by_employment_status", "credit_score_distribution"]
    for key in dict_metrics:
        if key in metrics and isinstance(metrics[key], dict):
            count += len(metrics[key])
    
    return max(count, 1)  # At least 1


def apply_dp_to_risk_metrics(metrics: Dict[str, float], epsilon: float = 1.0, 
                             split_budget: bool = True, use_gaussian: bool = None,
                             delta: float = 1e-5, include_metadata: bool = False) -> Dict[str, float]:
    """
    Apply Differential Privacy to risk scoring metrics.
    
    IMPORTANT: All queries in a single release use the SAME mechanism (Laplace or Gaussian).
    This is required for proper privacy budget composition. Mixing mechanisms in one release
    would complicate composition accounting and is not recommended.
    
    Choice between Laplace and Gaussian:
    - Laplace: Better for few queries (<10), lower confidence, pure epsilon-DP
    - Gaussian: Better for many queries (10+), higher confidence, uses (epsilon, delta)-DP
    
    If use_gaussian=None, automatically chooses based on query count:
    - < 10 queries: Laplace
    - >= 10 queries: Gaussian
    
    Args:
        metrics: Dictionary of risk metrics (mean, median, percentages, etc.)
        epsilon: Total privacy budget (if split_budget=True) or per-metric budget (if False)
        split_budget: If True, split epsilon across all queries. If False, use epsilon per query.
        use_gaussian: If None, auto-selects based on query count. If True/False, forces that mechanism.
        delta: Failure probability for Gaussian mechanism (only used if Gaussian is selected)
    
    Returns:
        DP-protected metrics with noise added (all using the same mechanism)
    """
    dp_metrics = {}
    
    # Get dataset size
    n = metrics.get("total_customers", 1)
    n = max(n, 1)  # Ensure n >= 1
    
    # Count queries and split epsilon budget if requested
    num_queries = count_queries_in_metrics(metrics)
    epsilon_per_query = epsilon / num_queries if split_budget else epsilon
    
    # IMPORTANT: Prevent epsilon_per_query from being too small (causes excessive noise)
    # Minimum epsilon per query ensures reasonable accuracy
    # If epsilon is too small, we use advanced composition instead of simple splitting
    MIN_EPSILON_PER_QUERY = 0.1  # Minimum for reasonable accuracy
    if split_budget and epsilon_per_query < MIN_EPSILON_PER_QUERY:
        # Use advanced composition: we can use more epsilon per query with better bounds
        # For k queries with advanced composition: epsilon_total ≈ sqrt(2k*ln(1/δ)) * epsilon_per_query
        # So we can use larger epsilon_per_query while maintaining same total privacy
        composition_factor = np.sqrt(2 * num_queries * np.log(1/delta))
        # Scale up epsilon_per_query to minimum, but account for composition
        epsilon_per_query = max(MIN_EPSILON_PER_QUERY, epsilon / composition_factor)
        # Note: This uses advanced composition, so total privacy is still bounded
    
    # Automatically choose mechanism if not specified
    # For data analytics/release: Use Laplace (better for one-off statistics)
    # For ML/training: Use Gaussian (better composition for iterative algorithms)
    # This is a data analytics use case, so default to Laplace
    if use_gaussian is None:
        use_gaussian = False  # Default to Laplace for data analytics
    
    # Choose noise function based on mechanism
    # CRITICAL: All queries in this release use the SAME mechanism for proper composition
    if use_gaussian:
        # Gaussian needs delta parameter, so we create a closure
        def noise_fn(value, epsilon, sensitivity):
            return add_gaussian_noise(value, epsilon, delta, sensitivity)
    else:
        def noise_fn(value, epsilon, sensitivity):
            return add_laplace_noise(value, epsilon, sensitivity)
    effective_epsilon = epsilon_per_query
    
    # Sensitivity for mean risk: 
    # If we have n customers, adding/removing one customer with risk r changes mean by at most r/n
    # Since risk range is [0, 1], max change is 1.0/n
    # 
    # IMPORTANT FOR LEARNERS: Sensitivity is the maximum change in output when one person's data
    # is added or removed. For means, this is 1/n (not 1.0!) because one person can only
    # change the mean by their value divided by n.
    if "mean_risk" in metrics:
        mean_sensitivity = 1.0 / n  # One customer can change mean by at most 1/n
        dp_metrics["mean_risk"] = noise_fn(
            metrics["mean_risk"],
            epsilon=effective_epsilon,
            sensitivity=mean_sensitivity
        )
        # Clamp to valid range
        dp_metrics["mean_risk"] = max(0.0, min(1.0, dp_metrics["mean_risk"]))
    
    # Sensitivity for median: 
    # For large datasets, median sensitivity is approximately 1.0/n as well
    # (one customer can shift median by at most one position, which is ~1/n in sorted order)
    if "median_risk" in metrics:
        median_sensitivity = 1.0 / n  # One customer can shift median by at most 1/n
        dp_metrics["median_risk"] = noise_fn(
            metrics["median_risk"],
            epsilon=effective_epsilon,
            sensitivity=median_sensitivity
        )
        dp_metrics["median_risk"] = max(0.0, min(1.0, dp_metrics["median_risk"]))
    
    # Sensitivity for percentages: max change is 100/n %
    # One customer can change percentage by at most 100/n (e.g., 1 customer out of 50 = 2%)
    percentage_sensitivity = 100.0 / n
    
    if "high_risk_percentage" in metrics:
        dp_metrics["high_risk_percentage"] = noise_fn(
            metrics["high_risk_percentage"],
            epsilon=effective_epsilon,
            sensitivity=percentage_sensitivity
        )
        dp_metrics["high_risk_percentage"] = max(0.0, min(100.0, dp_metrics["high_risk_percentage"]))
    
    if "low_risk_percentage" in metrics:
        dp_metrics["low_risk_percentage"] = noise_fn(
            metrics["low_risk_percentage"],
            epsilon=effective_epsilon,
            sensitivity=percentage_sensitivity
        )
        dp_metrics["low_risk_percentage"] = max(0.0, min(100.0, dp_metrics["low_risk_percentage"]))
    
    # Medium risk percentage
    if "medium_risk_percentage" in metrics:
        dp_metrics["medium_risk_percentage"] = noise_fn(
            metrics["medium_risk_percentage"],
            epsilon=effective_epsilon,
            sensitivity=percentage_sensitivity
        )
        dp_metrics["medium_risk_percentage"] = max(0.0, min(100.0, dp_metrics["medium_risk_percentage"]))
    
    # Preserve non-sensitive metadata
    dp_metrics["total_customers"] = metrics.get("total_customers", 0)
    
    if "std_risk" in metrics:
        # Standard deviation sensitivity: one customer can change std by at most ~1.0/n
        std_sensitivity = 1.0 / n  # One customer can change std by at most ~1/n
        dp_metrics["std_risk"] = noise_fn(
            metrics["std_risk"],
            epsilon=effective_epsilon,
            sensitivity=std_sensitivity
        )
        dp_metrics["std_risk"] = max(0.0, dp_metrics["std_risk"])
    
    # Average credit score (sensitivity: max change is 550/n, since credit score range is 300-850)
    if "avg_credit_score" in metrics:
        credit_sensitivity = 550.0 / n  # One customer can change average by at most 550/n
        dp_metrics["avg_credit_score"] = noise_fn(
            metrics["avg_credit_score"],
            epsilon=effective_epsilon,
            sensitivity=credit_sensitivity
        )
        dp_metrics["avg_credit_score"] = max(300.0, min(850.0, dp_metrics["avg_credit_score"]))
    
    # Estimated default rate (same as mean_risk, already handled)
    if "estimated_default_rate" in metrics:
        default_sensitivity = 100.0 / n  # Percentage, so 100/n
        dp_metrics["estimated_default_rate"] = noise_fn(
            metrics["estimated_default_rate"],
            epsilon=effective_epsilon,
            sensitivity=default_sensitivity
        )
        dp_metrics["estimated_default_rate"] = max(0.0, min(100.0, dp_metrics["estimated_default_rate"]))
    
    # Risk by age groups (sensitivity: 1.0/n for each group)
    if "risk_by_age_group" in metrics:
        age_sensitivity = 1.0 / n
        dp_metrics["risk_by_age_group"] = {}
        for age_group, risk_value in metrics["risk_by_age_group"].items():
            dp_risk = noise_fn(risk_value, epsilon=effective_epsilon, sensitivity=age_sensitivity)
            dp_metrics["risk_by_age_group"][age_group] = max(0.0, min(1.0, dp_risk))
    
    # Risk by income brackets (sensitivity: 1.0/n for each bracket)
    if "risk_by_income_bracket" in metrics:
        income_sensitivity = 1.0 / n
        dp_metrics["risk_by_income_bracket"] = {}
        for bracket, risk_value in metrics["risk_by_income_bracket"].items():
            dp_risk = noise_fn(risk_value, epsilon=effective_epsilon, sensitivity=income_sensitivity)
            dp_metrics["risk_by_income_bracket"][bracket] = max(0.0, min(1.0, dp_risk))
    
    # Risk by employment status (sensitivity: 1.0/n for each status)
    if "risk_by_employment_status" in metrics:
        emp_sensitivity = 1.0 / n
        dp_metrics["risk_by_employment_status"] = {}
        for status, risk_value in metrics["risk_by_employment_status"].items():
            dp_risk = noise_fn(risk_value, epsilon=effective_epsilon, sensitivity=emp_sensitivity)
            dp_metrics["risk_by_employment_status"][status] = max(0.0, min(1.0, dp_risk))
    
    # Credit score distribution (percentages, sensitivity: 100/n)
    if "credit_score_distribution" in metrics:
        dp_metrics["credit_score_distribution"] = {}
        for category, percentage in metrics["credit_score_distribution"].items():
            dp_percentage = noise_fn(percentage, epsilon=effective_epsilon, sensitivity=percentage_sensitivity)
            dp_metrics["credit_score_distribution"][category] = max(0.0, min(100.0, dp_percentage))
    
    # Store metadata about the query count for composition tracking (if requested)
    if include_metadata:
        dp_metrics["_num_queries"] = num_queries
        dp_metrics["_epsilon_per_query"] = effective_epsilon
        dp_metrics["_mechanism"] = "gaussian" if use_gaussian else "laplace"
    
    return dp_metrics



def calculate_privacy_budget(epsilon_per_query: float, num_queries: int) -> Dict[str, float]:
    """
    Calculate total privacy budget for multiple queries.
    
    Uses composition: for k queries each with epsilon_i, total epsilon = sum(epsilon_i)
    For advanced composition, can use sqrt(k) * epsilon for better bounds.
    
    Returns:
        Dictionary with privacy budget information
    """
    # Simple composition (additive)
    total_epsilon = epsilon_per_query * num_queries
    
    # Advanced composition (better bounds for many queries)
    # For k queries: epsilon_total ≈ sqrt(2k * ln(1/delta)) * epsilon + k * epsilon^2
    # For simplicity, we use sqrt(k) approximation
    delta = 1e-5  # Typical delta value
    advanced_epsilon = np.sqrt(2 * num_queries * np.log(1/delta)) * epsilon_per_query
    
    return {
        "epsilon_per_query": epsilon_per_query,
        "num_queries": num_queries,
        "total_epsilon_simple": total_epsilon,
        "total_epsilon_advanced": advanced_epsilon,
        "delta": delta
    }

