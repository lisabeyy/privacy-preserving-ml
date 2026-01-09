"""
Risk Scoring Model for Financial Data

USE CASE: Multi-Bank Loan Default Risk Analysis
===============================================

This platform enables multiple financial institutions to collaboratively analyze
loan default risk across their combined customer base WITHOUT sharing raw customer data.

Real-World Scenario:
- Bank A, Bank B, and Bank C want to understand industry-wide default trends
- They cannot share customer data directly (privacy regulations, competition)
- Solution: Each bank submits encrypted customer data to TEE
- TEE calculates aggregate risk metrics with Differential Privacy protection
- Banks receive privacy-protected insights (e.g., "15% high-risk customers industry-wide")
- Individual customer data cannot be reverse-engineered from results

What We Analyze:
- Loan default probability across customer segments
- Risk distribution (mean, median, high/low risk percentages)
- Industry-wide trends without exposing individual bank data
- Protected by Differential Privacy (ε-differential privacy guarantee)

This module implements a realistic risk scoring algorithm based on:
- Credit score (FICO-style, 300-850)
- Debt-to-income ratio
- Payment history (delinquency flags)
- Loan-to-income ratio
- Employment stability
- Account balance stability
"""

import numpy as np
from typing import List, Dict, Any


def calculate_risk_score(customer: Dict[str, Any]) -> float:
    """
    Calculate a realistic loan default risk score for a single customer.
    
    Based on industry-standard FICO-style risk factors:
    1. Credit Score (35%): Primary indicator of payment history and creditworthiness
    2. Debt-to-Income Ratio (25%): Ability to service debt
    3. Payment History (20%): Past delinquency is strongest predictor
    4. Loan-to-Income Ratio (10%): Loan burden relative to income
    5. Employment Stability (5%): Self-employed or unstable employment = higher risk
    6. Account Balance (5%): Low balances indicate financial stress
    
    Returns a risk score between 0 (low risk, unlikely to default) and 1 (high risk, likely to default).
    """
    # 1. Credit Score Factor (35% weight) - FICO range 300-850
    credit_score = customer.get("credit_score", 650)
    # Invert: lower score = higher risk
    # Excellent (750+): 0.0-0.15 risk
    # Good (700-749): 0.15-0.30 risk  
    # Fair (650-699): 0.30-0.50 risk
    # Poor (600-649): 0.50-0.75 risk
    # Very Poor (<600): 0.75-1.0 risk
    if credit_score >= 750:
        credit_factor = max(0.0, (750 - credit_score) / 450) * 0.15
    elif credit_score >= 700:
        credit_factor = 0.15 + ((700 - credit_score) / 50) * 0.15
    elif credit_score >= 650:
        credit_factor = 0.30 + ((650 - credit_score) / 50) * 0.20
    elif credit_score >= 600:
        credit_factor = 0.50 + ((600 - credit_score) / 50) * 0.25
    else:
        credit_factor = 0.75 + min(0.25, (600 - credit_score) / 300)
    credit_factor = max(0.0, min(1.0, credit_factor))
    
    # 2. Debt-to-Income Ratio (25% weight)
    income = float(customer.get("income", 50000))
    monthly_expenses = float(customer.get("monthly_expenses", 2000))
    loan_amount = float(customer.get("loan_amount", 0))
    
    # Calculate monthly loan payment (assume 5% annual rate, 3-year term)
    if loan_amount > 0:
        monthly_rate = 0.05 / 12
        num_payments = 36
        if monthly_rate > 0:
            monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
        else:
            monthly_payment = loan_amount / num_payments
    else:
        monthly_payment = 0
    
    total_monthly_debt = monthly_expenses + monthly_payment
    monthly_income = income / 12 if income > 0 else 0
    
    if monthly_income > 0:
        dti_ratio = total_monthly_debt / monthly_income
        # DTI thresholds: <36% = low risk, 36-43% = moderate, >43% = high risk
        if dti_ratio < 0.36:
            dti_factor = dti_ratio / 0.36 * 0.3  # 0-0.3
        elif dti_ratio < 0.43:
            dti_factor = 0.3 + ((dti_ratio - 0.36) / 0.07) * 0.4  # 0.3-0.7
        else:
            dti_factor = 0.7 + min(0.3, (dti_ratio - 0.43) / 0.2)  # 0.7-1.0
    else:
        dti_factor = 1.0
    
    # 3. Payment History / Delinquency (20% weight) - Strongest predictor
    delinquency_flag = customer.get("delinquency_flag", False)
    if isinstance(delinquency_flag, str):
        delinquency_flag = delinquency_flag.lower() in ["true", "1", "yes"]
    # Past delinquency is a strong indicator - weight it heavily
    delinquency_factor = 0.8 if delinquency_flag else 0.0
    
    # 4. Loan-to-Income Ratio (10% weight)
    if income > 0:
        loan_ratio = loan_amount / income
        # Loan ratios: <20% = low, 20-40% = moderate, >40% = high
        if loan_ratio < 0.20:
            loan_factor = loan_ratio / 0.20 * 0.3
        elif loan_ratio < 0.40:
            loan_factor = 0.3 + ((loan_ratio - 0.20) / 0.20) * 0.4
        else:
            loan_factor = 0.7 + min(0.3, (loan_ratio - 0.40) / 0.30)
    else:
        loan_factor = 1.0
    
    # 5. Employment Stability (5% weight)
    employment_status = customer.get("employment_status", "Unknown").lower()
    if employment_status in ["employed", "full-time"]:
        employment_factor = 0.0
    elif employment_status in ["self-employed", "part-time", "contractor"]:
        employment_factor = 0.3
    elif employment_status in ["unemployed", "retired"]:
        employment_factor = 0.6
    else:
        employment_factor = 0.4  # Unknown
    
    # 6. Account Balance Stability (5% weight)
    account_balance = float(customer.get("account_balance", 0))
    monthly_income = income / 12 if income > 0 else 1
    # Low balance relative to income indicates financial stress
    balance_ratio = account_balance / monthly_income if monthly_income > 0 else 0
    if balance_ratio < 0.5:  # Less than 2 weeks of income
        balance_factor = 0.8
    elif balance_ratio < 2.0:  # Less than 2 months
        balance_factor = 0.4
    else:
        balance_factor = 0.0
    
    # Weighted combination (industry-standard weights)
    weights = {
        "credit": 0.35,      # Credit score is primary factor
        "dti": 0.25,         # Debt-to-income critical
        "delinquency": 0.20, # Payment history very important
        "loan": 0.10,        # Loan burden
        "employment": 0.05,  # Employment stability
        "balance": 0.05      # Account balance
    }
    
    risk_score = (
        weights["credit"] * credit_factor +
        weights["dti"] * dti_factor +
        weights["delinquency"] * delinquency_factor +
        weights["loan"] * loan_factor +
        weights["employment"] * employment_factor +
        weights["balance"] * balance_factor
    )
    
    # Ensure score is between 0 and 1
    return max(0.0, min(1.0, risk_score))


def calculate_aggregate_risk_scores(customers: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Calculate comprehensive aggregate risk metrics and analytics from a list of customers.
    
    Returns:
        - Basic metrics: mean, median, high/low risk percentages
        - Risk distribution: by age groups, income brackets, employment status
        - Credit score analytics: average, distribution
        - Default probability estimates
    """
    if not customers:
        return {
            "mean_risk": 0.0,
            "median_risk": 0.0,
            "high_risk_percentage": 0.0,
            "low_risk_percentage": 0.0,
            "total_customers": 0,
            "std_risk": 0.0
        }
    
    # Calculate risk scores for all customers
    risk_scores = [calculate_risk_score(customer) for customer in customers]
    
    # Basic statistics
    mean_risk = float(np.mean(risk_scores))
    median_risk = float(np.median(risk_scores))
    std_risk = float(np.std(risk_scores))
    
    # Risk categories
    high_risk_count = sum(1 for r in risk_scores if r > 0.7)
    medium_risk_count = sum(1 for r in risk_scores if 0.3 <= r <= 0.7)
    low_risk_count = sum(1 for r in risk_scores if r < 0.3)
    
    # Credit score analytics
    credit_scores = [c.get("credit_score", 650) for c in customers if c.get("credit_score")]
    avg_credit_score = float(np.mean(credit_scores)) if credit_scores else 0.0
    
    # Risk by age groups
    age_groups = {
        "18-30": [],
        "31-45": [],
        "46-60": [],
        "61+": []
    }
    for customer, risk in zip(customers, risk_scores):
        age = customer.get("age", 35)
        if age <= 30:
            age_groups["18-30"].append(risk)
        elif age <= 45:
            age_groups["31-45"].append(risk)
        elif age <= 60:
            age_groups["46-60"].append(risk)
        else:
            age_groups["61+"].append(risk)
    
    risk_by_age = {
        group: float(np.mean(risks)) if risks else 0.0
        for group, risks in age_groups.items()
    }
    
    # Risk by income brackets
    income_brackets = {
        "Low (<$50k)": [],
        "Medium ($50k-$100k)": [],
        "High (>$100k)": []
    }
    for customer, risk in zip(customers, risk_scores):
        income = customer.get("income", 50000)
        if income < 50000:
            income_brackets["Low (<$50k)"].append(risk)
        elif income <= 100000:
            income_brackets["Medium ($50k-$100k)"].append(risk)
        else:
            income_brackets["High (>$100k)"].append(risk)
    
    risk_by_income = {
        bracket: float(np.mean(risks)) if risks else 0.0
        for bracket, risks in income_brackets.items()
    }
    
    # Risk by employment status
    risk_by_employment = {}
    employment_groups = {}
    for customer, risk in zip(customers, risk_scores):
        emp_status = customer.get("employment_status", "Unknown")
        if emp_status not in employment_groups:
            employment_groups[emp_status] = []
        employment_groups[emp_status].append(risk)
    
    risk_by_employment = {
        status: float(np.mean(risks)) if risks else 0.0
        for status, risks in employment_groups.items()
    }
    
    # Default probability estimate (risk score as probability)
    estimated_default_rate = mean_risk * 100  # Convert to percentage
    
    # Credit score distribution
    excellent_credit = sum(1 for cs in credit_scores if cs >= 750)
    good_credit = sum(1 for cs in credit_scores if 700 <= cs < 750)
    fair_credit = sum(1 for cs in credit_scores if 650 <= cs < 700)
    poor_credit = sum(1 for cs in credit_scores if cs < 650)
    total_with_credit = len(credit_scores)
    
    return {
        # Basic metrics
        "mean_risk": mean_risk,
        "median_risk": median_risk,
        "high_risk_percentage": float(high_risk_count / len(customers) * 100),
        "medium_risk_percentage": float(medium_risk_count / len(customers) * 100),
        "low_risk_percentage": float(low_risk_count / len(customers) * 100),
        "total_customers": len(customers),
        "std_risk": std_risk,
        
        # Credit score analytics
        "avg_credit_score": avg_credit_score,
        "credit_score_distribution": {
            "excellent_750_plus": float(excellent_credit / total_with_credit * 100) if total_with_credit > 0 else 0.0,
            "good_700_749": float(good_credit / total_with_credit * 100) if total_with_credit > 0 else 0.0,
            "fair_650_699": float(fair_credit / total_with_credit * 100) if total_with_credit > 0 else 0.0,
            "poor_below_650": float(poor_credit / total_with_credit * 100) if total_with_credit > 0 else 0.0
        },
        
        # Risk by demographics
        "risk_by_age_group": risk_by_age,
        "risk_by_income_bracket": risk_by_income,
        "risk_by_employment_status": risk_by_employment,
        
        # Default probability
        "estimated_default_rate": estimated_default_rate
    }

