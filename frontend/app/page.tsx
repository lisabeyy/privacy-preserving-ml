'use client'

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Send, Shield, CheckCircle, AlertCircle, Loader2, Lock, Eye, TrendingUp, Info, HelpCircle } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface JobResult {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: {
    risk_metrics: {
      mean_risk: number
      median_risk: number
      high_risk_percentage: number
      medium_risk_percentage?: number
      low_risk_percentage: number
      total_customers: number
      avg_credit_score?: number
      credit_score_distribution?: {
        excellent_750_plus: number
        good_700_749: number
        fair_650_699: number
        poor_below_650: number
      }
      risk_by_age_group?: Record<string, number>
      risk_by_income_bracket?: Record<string, number>
      risk_by_employment_status?: Record<string, number>
      estimated_default_rate?: number
    }
    raw_metrics?: {
      mean_risk: number
      median_risk: number
      high_risk_percentage: number
      medium_risk_percentage?: number
      low_risk_percentage: number
      total_customers: number
      avg_credit_score?: number
      credit_score_distribution?: {
        excellent_750_plus: number
        good_700_749: number
        fair_650_699: number
        poor_below_650: number
      }
      risk_by_age_group?: Record<string, number>
      risk_by_income_bracket?: Record<string, number>
      risk_by_employment_status?: Record<string, number>
      estimated_default_rate?: number
    }
    privacy_budget: {
      epsilon_per_query: number
      total_epsilon_simple: number
    }
  }
  attestation?: {
    signing_address: string
    signature: string
    intel_quote?: string
    nonce?: string
    request_nonce?: string
  }
  error?: string
}

export default function Home() {
  const [mockData, setMockData] = useState<any[]>([])
  const [userEntry, setUserEntry] = useState({
    age: '35',
    income: '75000',
    employment_status: 'Employed',
    credit_score: '680',
    loan_amount: '12000',
    monthly_expenses: '2400',
    account_balance: '15000',
    delinquency_flag: 'false'
  })
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobResult, setJobResult] = useState<JobResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [epsilon, setEpsilon] = useState('1.0')
  const [attestationVerified, setAttestationVerified] = useState<boolean | null>(null)
  const [verificationDetails, setVerificationDetails] = useState<any>(null)

  // Load mock data on mount
  useEffect(() => {
    const loadMockData = async () => {
      try {
        // Try public folder first (Next.js serves from /public)
        const response = await fetch('/financial_data.json')
        if (!response.ok) throw new Error('Not found')
        const data = await response.json()
        setMockData(data)
      } catch (error) {
        console.error('Failed to load mock data:', error)
        // If file doesn't exist, use empty array (user can still contribute)
        setMockData([])
      }
    }
    loadMockData()
  }, [])

  // Poll for job results
  useEffect(() => {
    if (!jobId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/job/${jobId}`)
        const job = response.data
        setJobResult(job)

        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(pollInterval)
          setLoading(false)
        }
      } catch (error) {
        console.error('Polling error:', error)
        clearInterval(pollInterval)
        setLoading(false)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [jobId])

  const handleUserEntryChange = (field: string, value: string) => {
    setUserEntry(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (mockData.length === 0) {
      alert('Loading mock data... Please wait.')
      return
    }

    // Create user's customer record
    const userCustomerRecord = {
      customer_id: `CUST${Date.now()}`,
      age: parseInt(userEntry.age) || 35,
      income: parseInt(userEntry.income) || 75000,
      employment_status: userEntry.employment_status,
      credit_score: parseInt(userEntry.credit_score) || 680,
      loan_amount: parseInt(userEntry.loan_amount) || 12000,
      loan_purpose: 'Personal Loan',
      monthly_expenses: parseInt(userEntry.monthly_expenses) || 2400,
      transaction_volume: 32000,
      account_balance: parseInt(userEntry.account_balance) || 15000,
      delinquency_flag: userEntry.delinquency_flag === 'true'
    }

    // Combine mock data + user entry
    const combinedData = [...mockData, userCustomerRecord]

    setLoading(true)
    setJobResult(null)
    setAttestationVerified(null)
    setVerificationDetails(null)

    try {
      const response = await axios.post(`${API_URL}/api/submit`, {
        data: combinedData,
        epsilon: parseFloat(epsilon) || 1.0
      })

      setJobId(response.data.jobId)
    } catch (error: any) {
      console.error('Submit error:', error)
      let errorMessage = 'Unknown error'
      
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        errorMessage = 'Network error: Cannot connect to backend server. Make sure the backend is running on port 3001.'
      } else if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || `Server error: ${error.response.status}`
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert(`Error submitting data: ${errorMessage}`)
      setLoading(false)
    }
  }

  const formatRiskScore = (score: number) => {
    return (score * 100).toFixed(2) + '%'
  }

  // Tooltip component for explanations
  const TooltipInfo = ({ text, children }: { text: string, children?: React.ReactNode }) => {
    const [showTooltip, setShowTooltip] = useState(false)
    return (
      <div className="relative inline-block">
        <div 
          className="inline-flex items-center cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {children}
          <HelpCircle className="w-4 h-4 ml-1 text-gray-500" />
        </div>
        {showTooltip && (
          <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg text-sm text-gray-300">
            {text}
            <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 border-r border-b border-gray-700"></div>
          </div>
        )}
      </div>
    )
  }

  // Chart colors
  const CHART_COLORS = {
    low: '#10b981',
    medium: '#eab308',
    high: '#ef4444',
    excellent: '#10b981',
    good: '#22c55e',
    fair: '#eab308',
    poor: '#ef4444'
  }

  // Custom tooltip with subtle background for readability
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="mb-1 last:mb-0">
              <span style={{ color: entry.color }} className="font-medium">{entry.name}: </span>
              <span className="text-gray-200 font-medium">
                {typeof entry.value === 'number' ? entry.value.toFixed(1) + '%' : entry.value}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const handleVerifyAttestation = async () => {
    if (!jobResult?.attestation || !jobResult?.result) return

    try {
      const response = await axios.post(`${API_URL}/api/verify`, {
        attestation: jobResult.attestation,
        result: jobResult.result,
        requestNonce: jobResult.attestation.nonce || jobResult.attestation.request_nonce
      })

      setAttestationVerified(response.data.verified)
      setVerificationDetails(response.data.details)
    } catch (error: any) {
      setAttestationVerified(false)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error'
      setVerificationDetails({ 
        error: typeof errorMessage === 'string' 
          ? errorMessage 
          : errorMessage?.message || JSON.stringify(errorMessage)
      })
    }
  }

  const calculateDifference = (raw: number, dp: number) => {
    const diff = ((dp - raw) / raw) * 100
    return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-light mb-6 tracking-tight">
            Confidential Analytics Platform
          </h1>
          <p className="text-xl text-gray-400 font-light max-w-3xl mx-auto leading-relaxed">
            Understanding <span className="text-[#10b981] font-medium">Differential Privacy</span> and{' '}
            <span className="text-[#10b981] font-medium">Trusted Execution Environments</span> through real-world financial risk analysis
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {/* Submit Form Section with 2 columns */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Side: Submit Form */}
            <div className="border border-gray-800 bg-gray-900/30 p-8">
            <h2 className="text-2xl font-light mb-6 flex items-center gap-3">
              <Send className="w-6 h-6 text-[#10b981]" />
              Submit Privately Financial Data
            </h2>

            <div className="mb-4 p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded">
              <p className="text-base text-gray-300">
                <span className="text-[#10b981] font-medium">{mockData.length}</span> customer records already loaded.
                Add yours to see aggregate risk analysis!
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-300">
                    Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={userEntry.age}
                    onChange={(e) => handleUserEntryChange('age', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 bg-black text-white rounded focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981]"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-300">
                    Annual Income ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={userEntry.income}
                    onChange={(e) => handleUserEntryChange('income', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 bg-black text-white rounded focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981]"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-300">
                    Credit Score (FICO)
                  </label>
                  <input
                    type="number"
                    min="300"
                    max="850"
                    value={userEntry.credit_score}
                    onChange={(e) => handleUserEntryChange('credit_score', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 bg-black text-white rounded focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981]"
                    disabled={loading}
                    placeholder="300-850"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    FICO credit score range: 300 (poor) to 850 (excellent). Typical scores: 670-739 (good), 740-799 (very good), 800+ (exceptional)
                  </p>
                </div>
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-300">
                    Employment Status
                  </label>
                  <select
                    value={userEntry.employment_status}
                    onChange={(e) => handleUserEntryChange('employment_status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 bg-black text-white rounded focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981]"
                    disabled={loading}
                  >
                    <option value="Employed">Employed</option>
                    <option value="Self-employed">Self-employed</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Unemployed">Unemployed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-300">
                    Loan Amount ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={userEntry.loan_amount}
                    onChange={(e) => handleUserEntryChange('loan_amount', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 bg-black text-white rounded focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981]"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-300">
                    Monthly Expenses ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={userEntry.monthly_expenses}
                    onChange={(e) => handleUserEntryChange('monthly_expenses', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 bg-black text-white rounded focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981]"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-300">
                    Account Balance ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={userEntry.account_balance}
                    onChange={(e) => handleUserEntryChange('account_balance', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 bg-black text-white rounded focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981]"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-300">
                    Delinquency Flag
                  </label>
                  <select
                    value={userEntry.delinquency_flag}
                    onChange={(e) => handleUserEntryChange('delinquency_flag', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 bg-black text-white rounded focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981]"
                    disabled={loading}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-base font-medium text-gray-300">
                    Privacy Budget (ε)
                  </label>
                  <span className="text-lg font-mono text-[#10b981]">{epsilon}</span>
                </div>
                
                {/* Interactive Slider */}
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={epsilon}
                  onChange={(e) => setEpsilon(e.target.value)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${(parseFloat(epsilon) / 10) * 100}%, #374151 ${(parseFloat(epsilon) / 10) * 100}%, #374151 100%)`
                  }}
                  disabled={loading}
                />
                
                {/* Scale Labels */}
                <div className="flex justify-between text-base text-gray-500 mt-1">
                  <span>0.1</span>
                  <span>5.0</span>
                  <span>10.0</span>
                </div>

                {/* Interactive Privacy Explanation */}
                <div className="mt-4 p-4 bg-gray-900/50 border border-gray-800 rounded">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-base font-medium text-gray-300 mb-2">
                        {parseFloat(epsilon) < 0.5 ? (
                          <>🔒 Maximum Privacy</>
                        ) : parseFloat(epsilon) < 1.5 ? (
                          <>🛡️ High Privacy</>
                        ) : parseFloat(epsilon) < 3 ? (
                          <>⚖️ Balanced</>
                        ) : parseFloat(epsilon) < 6 ? (
                          <>📊 More Accuracy</>
                        ) : (
                          <>📈 Maximum Accuracy</>
                        )}
                      </div>
                      <p className="text-base text-gray-400 leading-relaxed">
                        {parseFloat(epsilon) < 0.5 ? (
                          <>Very strong privacy protection. Results will have significant noise, making it nearly impossible to identify individual customers. Best for highly sensitive data.</>
                        ) : parseFloat(epsilon) < 1.5 ? (
                          <>Strong privacy protection with moderate noise. Good balance for most financial applications. Individual customer data is well-protected.</>
                        ) : parseFloat(epsilon) < 3 ? (
                          <>Balanced privacy and accuracy. Some noise added, but results remain useful for analysis. Suitable for aggregate risk assessment.</>
                        ) : parseFloat(epsilon) < 6 ? (
                          <>Lower privacy protection, but more accurate results. Small amount of noise. Use when accuracy is more important than maximum privacy.</>
                        ) : (
                          <>Minimal privacy protection. Results are very accurate with little noise. Use only when privacy requirements are less strict.</>
                        )}
                      </p>
                      <div className="mt-3 pt-3 border-t border-gray-800">
                        <div className="flex items-center justify-between text-base">
                          <span className="text-gray-500">Privacy Level:</span>
                          <span className="text-[#10b981] font-medium">
                            {parseFloat(epsilon) < 0.5 ? 'Very High' :
                             parseFloat(epsilon) < 1.5 ? 'High' :
                             parseFloat(epsilon) < 3 ? 'Medium' :
                             parseFloat(epsilon) < 6 ? 'Low' : 'Very Low'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-base mt-1">
                          <span className="text-gray-500">Noise Level:</span>
                          <span className="text-[#10b981] font-medium">
                            {parseFloat(epsilon) < 0.5 ? 'High' :
                             parseFloat(epsilon) < 1.5 ? 'Medium-High' :
                             parseFloat(epsilon) < 3 ? 'Medium' :
                             parseFloat(epsilon) < 6 ? 'Low' : 'Very Low'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || mockData.length === 0}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-medium py-4 px-6 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing in Secure Enclave...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Analyze with Privacy Protection ({mockData.length + 1} total customers)
                  </>
                )}
              </button>
            </div>
            </div>

            {/* Right Side: DP and TEE Explanations */}
            <div className="space-y-6">
              <div className="border border-gray-800 p-6 bg-gray-900/50 hover:border-[#10b981]/50 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <Lock className="w-5 h-5 text-[#10b981]" />
                  <h3 className="text-lg font-medium">What is Differential Privacy?</h3>
                </div>
                <p className="text-gray-400 text-base leading-relaxed mb-3">
                  Differential Privacy adds carefully calibrated noise to results, ensuring that individual data points cannot be reverse-engineered from the output. 
                  Lower ε (epsilon) values mean stronger privacy protection but more noise in results.
                </p>
                <div className="mt-4 p-3 bg-black/50 rounded border border-gray-800">
                  <p className="text-base text-gray-500 mb-1">Example:</p>
                  <p className="text-base text-gray-400">
                    With ε=0.5: Mean risk might show <span className="text-[#10b981]">45.2%</span> instead of <span className="text-gray-600">44.8%</span> (small noise, high privacy)
                    <br />
                    With ε=5.0: Mean risk shows <span className="text-[#10b981]">44.9%</span> instead of <span className="text-gray-600">44.8%</span> (tiny noise, lower privacy)
                  </p>
                </div>
              </div>
              <div className="border border-gray-800 p-6 bg-gray-900/50 hover:border-[#10b981]/50 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-5 h-5 text-[#10b981]" />
                  <h3 className="text-lg font-medium">What is a TEE?</h3>
                </div>
                <p className="text-gray-400 text-base leading-relaxed mb-3">
                  A Trusted Execution Environment (TEE) is hardware-isolated secure enclave where data is decrypted and processed. 
                  Even cloud providers cannot access data inside a TEE. Attestation proves computation ran securely.
                </p>
                <div className="mt-4 p-3 bg-black/50 rounded border border-gray-800">
                  <p className="text-base text-gray-500 mb-1">How it works:</p>
                  <ol className="text-base text-gray-400 list-decimal list-inside space-y-1">
                    <li>Your data is encrypted before sending</li>
                    <li>Only decrypted inside the TEE (hardware-isolated)</li>
                    <li>Analysis runs securely, even cloud can't see it</li>
                    <li>Attestation proves it ran in a real TEE</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="border border-gray-800 bg-gray-900/30 p-8">
            <h2 className="text-2xl font-light mb-6 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-[#10b981]" />
              Analysis Results
            </h2>

            {!jobResult && !loading && (
              <div className="text-center py-16 text-gray-600">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Upload data to see privacy-protected results</p>
                {mockData.length > 0 && (
                  <p className="text-base text-gray-700 mt-2">
                    {mockData.length} customer records ready
                  </p>
                )}
              </div>
            )}

            {loading && (
              <div className="text-center py-16">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#10b981]" />
                <p className="text-gray-400">Processing securely inside TEE...</p>
              </div>
            )}

            {jobResult?.status === 'failed' && (
              <div className="border border-red-900 bg-red-950/30 p-4 rounded">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-300 text-base">
                  {typeof jobResult.error === 'string' 
                    ? jobResult.error 
                    : jobResult.error?.message || jobResult.error?.error || JSON.stringify(jobResult.error)}
                </p>
              </div>
            )}

            {jobResult?.status === 'completed' && jobResult.result && (
              <div className="space-y-6">
                <div className="border border-[#10b981] bg-[#10b981]/10 p-4 rounded">
                  <div className="flex items-center gap-2 text-[#10b981] mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Analysis Complete</span>
                  </div>
                  <p className="text-base text-gray-400 mb-2">Results protected with Differential Privacy (ε={epsilon})</p>
                  <div className="text-base text-gray-500 bg-black/30 p-2 rounded">
                    <p className="mb-1">🔒 Your data was:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                      <li>Encrypted in transit to the TEE</li>
                      <li>Decrypted only inside hardware-isolated secure enclave</li>
                      <li>Analyzed with privacy protection (ε={epsilon})</li>
                      <li>Individual customer data cannot be reverse-engineered</li>
                    </ul>
                  </div>
                </div>

                {/* Risk Distribution Chart */}
                {jobResult.result.raw_metrics && (
                  <div className="border border-gray-800 rounded overflow-hidden mb-6">
                    <div className="bg-gray-900 p-4 border-b border-gray-800">
                      <h3 className="font-medium text-base mb-1 flex items-center gap-2">
                        <TooltipInfo text="This chart shows the distribution of customers across risk categories. High risk (>70%) means likely to default, Low risk (<30%) means unlikely to default. The protected values include Differential Privacy noise.">
                          Risk Distribution
                        </TooltipInfo>
                      </h3>
                      <p className="text-base text-gray-500">Customer distribution across risk categories</p>
                    </div>
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={[
                          {
                            category: 'Low Risk',
                            'Raw %': jobResult.result.raw_metrics.low_risk_percentage,
                            'Protected %': jobResult.result.risk_metrics.low_risk_percentage
                          },
                          {
                            category: 'Medium Risk',
                            'Raw %': jobResult.result.raw_metrics.medium_risk_percentage || 0,
                            'Protected %': jobResult.result.risk_metrics.medium_risk_percentage || 0
                          },
                          {
                            category: 'High Risk',
                            'Raw %': jobResult.result.raw_metrics.high_risk_percentage,
                            'Protected %': jobResult.result.risk_metrics.high_risk_percentage
                          }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                          <XAxis dataKey="category" stroke="#888" />
                          <YAxis stroke="#888" label={{ value: 'Percentage %', angle: -90, position: 'insideLeft' }} />
                          <RechartsTooltip 
                            content={<CustomTooltip />}
                            cursor={{ fill: 'transparent' }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="Raw %" 
                            fill="#666" 
                            opacity={0.7} 
                            radius={[4, 4, 0, 0]}
                            activeBar={{ opacity: 1, fill: '#666' }}
                          />
                          <Bar 
                            dataKey="Protected %" 
                            fill="#10b981" 
                            opacity={0.7}
                            radius={[4, 4, 0, 0]}
                            activeBar={{ opacity: 1, fill: '#10b981' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Comparison Table */}
                {jobResult.result.raw_metrics && (
                  <div className="border border-gray-800 rounded overflow-hidden mb-6">
                    <div className="bg-gray-900 p-4 border-b border-gray-800">
                      <h3 className="font-medium text-base mb-1 flex items-center gap-2">
                        <TooltipInfo text="Compare raw (unprotected) metrics with privacy-protected metrics. The difference shows how Differential Privacy adds noise to protect individual customer data.">
                          Raw vs Privacy-Protected Comparison
                        </TooltipInfo>
                      </h3>
                      <p className="text-base text-gray-500">See how Differential Privacy affects the results</p>
                    </div>
                    <div className="divide-y divide-gray-800">
                      <div className="p-4 grid grid-cols-3 gap-4">
                        <div className="text-base text-gray-500">Metric</div>
                        <div className="text-base text-gray-500">Raw (No Privacy)</div>
                        <div className="text-base text-gray-500">Protected (ε={epsilon})</div>
                      </div>
                      <div className="p-4 grid grid-cols-3 gap-4 items-center">
                        <div className="text-base font-medium flex items-center gap-2">
                          <TooltipInfo text="Mean (average) risk score across all customers. Higher values indicate higher overall default risk.">
                            Mean Risk
                          </TooltipInfo>
                        </div>
                        <div className="text-lg font-light">{formatRiskScore(jobResult.result.raw_metrics.mean_risk)}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-light">{formatRiskScore(jobResult.result.risk_metrics.mean_risk)}</span>
                          <span className="text-base text-gray-600">
                            ({calculateDifference(jobResult.result.raw_metrics.mean_risk, jobResult.result.risk_metrics.mean_risk)})
                          </span>
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-3 gap-4 items-center">
                        <div className="text-base font-medium flex items-center gap-2">
                          <TooltipInfo text="Median risk score - the middle value when all risk scores are sorted. Less affected by outliers than mean.">
                            Median Risk
                          </TooltipInfo>
                        </div>
                        <div className="text-lg font-light">{formatRiskScore(jobResult.result.raw_metrics.median_risk)}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-light">{formatRiskScore(jobResult.result.risk_metrics.median_risk)}</span>
                          <span className="text-base text-gray-600">
                            ({calculateDifference(jobResult.result.raw_metrics.median_risk, jobResult.result.risk_metrics.median_risk)})
                          </span>
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-3 gap-4 items-center">
                        <div className="text-base font-medium flex items-center gap-2">
                          <TooltipInfo text="Percentage of customers with risk score >70% (high default probability).">
                            High Risk %
                          </TooltipInfo>
                        </div>
                        <div className="text-lg font-light">{jobResult.result.raw_metrics.high_risk_percentage.toFixed(1)}%</div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-light">{jobResult.result.risk_metrics.high_risk_percentage.toFixed(1)}%</span>
                          <span className="text-base text-gray-600">
                            ({calculateDifference(jobResult.result.raw_metrics.high_risk_percentage, jobResult.result.risk_metrics.high_risk_percentage)})
                          </span>
                        </div>
                      </div>
                      {jobResult.result.raw_metrics.medium_risk_percentage !== undefined && (
                        <div className="p-4 grid grid-cols-3 gap-4 items-center">
                          <div className="text-base font-medium flex items-center gap-2">
                            <TooltipInfo text="Percentage of customers with risk score between 30-70% (moderate default probability).">
                              Medium Risk %
                            </TooltipInfo>
                          </div>
                          <div className="text-lg font-light">{jobResult.result.raw_metrics.medium_risk_percentage.toFixed(1)}%</div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-light">
                              {jobResult.result.risk_metrics.medium_risk_percentage?.toFixed(1) || '0.0'}%
                            </span>
                            <span className="text-base text-gray-600">
                              ({calculateDifference(
                                jobResult.result.raw_metrics.medium_risk_percentage, 
                                jobResult.result.risk_metrics.medium_risk_percentage || 0
                              )})
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="p-4 grid grid-cols-3 gap-4 items-center">
                        <div className="text-base font-medium flex items-center gap-2">
                          <TooltipInfo text="Percentage of customers with risk score <30% (low default probability).">
                            Low Risk %
                          </TooltipInfo>
                        </div>
                        <div className="text-lg font-light">{jobResult.result.raw_metrics.low_risk_percentage.toFixed(1)}%</div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-light">{jobResult.result.risk_metrics.low_risk_percentage.toFixed(1)}%</span>
                          <span className="text-base text-gray-600">
                            ({calculateDifference(jobResult.result.raw_metrics.low_risk_percentage, jobResult.result.risk_metrics.low_risk_percentage)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Analytics - Credit Score */}
                {jobResult.result.risk_metrics.avg_credit_score && (
                  <div className="border border-gray-800 rounded overflow-hidden mb-6">
                    <div className="bg-gray-900 p-4 border-b border-gray-800">
                      <h3 className="font-medium text-base mb-1 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#10b981]" />
                        <TooltipInfo text="Credit scores indicate customer creditworthiness. Higher scores (750+) mean lower default risk. This data is protected with Differential Privacy to prevent reverse-engineering individual scores.">
                          Credit Score Analytics
                        </TooltipInfo>
                      </h3>
                      <p className="text-base text-gray-500">Average credit score and distribution across all customers</p>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center p-4 bg-black/30 rounded border border-gray-800">
                        <div>
                          <div className="text-base text-gray-400 mb-1">Average Credit Score</div>
                          {jobResult.result.raw_metrics?.avg_credit_score && (
                            <div className="text-xs text-gray-600">Raw: {jobResult.result.raw_metrics.avg_credit_score.toFixed(0)}</div>
                          )}
                        </div>
                        <span className="text-3xl font-light text-[#10b981]">
                          {jobResult.result.risk_metrics.avg_credit_score.toFixed(0)}
                        </span>
                      </div>
                      {jobResult.result.risk_metrics.credit_score_distribution && (
                        <div className="pt-3 border-t border-gray-800">
                          <h4 className="text-base font-medium mb-3 text-gray-300">Credit Score Distribution</h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Excellent (750+)', value: jobResult.result.risk_metrics.credit_score_distribution.excellent_750_plus || 0 },
                                  { name: 'Good (700-749)', value: jobResult.result.risk_metrics.credit_score_distribution.good_700_749 || 0 },
                                  { name: 'Fair (650-699)', value: jobResult.result.risk_metrics.credit_score_distribution.fair_650_699 || 0 },
                                  { name: 'Poor (<650)', value: jobResult.result.risk_metrics.credit_score_distribution.poor_below_650 || 0 }
                                ]}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                <Cell fill={CHART_COLORS.excellent} />
                                <Cell fill={CHART_COLORS.good} />
                                <Cell fill={CHART_COLORS.fair} />
                                <Cell fill={CHART_COLORS.poor} />
                              </Pie>
                              <RechartsTooltip 
                                formatter={(value: number) => `${value.toFixed(1)}%`}
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #404040', borderRadius: '8px' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Risk by Demographics */}
                {(jobResult.result.risk_metrics.risk_by_age_group || jobResult.result.risk_metrics.risk_by_income_bracket || jobResult.result.risk_metrics.risk_by_employment_status) && (
                  <div className="border border-gray-800 rounded overflow-hidden mb-6">
                    <div className="bg-gray-900 p-4 border-b border-gray-800">
                      <h3 className="font-medium text-base mb-1 flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#10b981]" />
                        <TooltipInfo text="Risk scores vary by customer demographics. Higher scores indicate higher default probability. Data is protected with Differential Privacy to prevent identifying individual customers.">
                          Risk by Demographics
                        </TooltipInfo>
                      </h3>
                      <p className="text-base text-gray-500">Risk distribution across customer segments (protected with Differential Privacy)</p>
                    </div>
                    <div className="p-4 space-y-6">
                      {jobResult.result.risk_metrics.risk_by_age_group && (
                        <div>
                          <h4 className="text-base font-medium mb-3 text-gray-300 flex items-center gap-2">
                            <TooltipInfo text="Age groups show how default risk varies by customer age. Younger customers may have less credit history, while older customers may have more stable finances.">
                              By Age Group
                            </TooltipInfo>
                          </h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={Object.entries(jobResult.result.risk_metrics.risk_by_age_group).map(([age, risk]) => ({
                              name: age,
                              'Protected Risk': (risk as number) * 100,
                              'Raw Risk': jobResult.result.raw_metrics?.risk_by_age_group?.[age] ? (jobResult.result.raw_metrics.risk_by_age_group[age] * 100) : undefined
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                              <XAxis dataKey="name" stroke="#888" />
                              <YAxis stroke="#888" label={{ value: 'Risk %', angle: -90, position: 'insideLeft' }} />
                              <RechartsTooltip 
                                content={<CustomTooltip />}
                                cursor={{ fill: 'transparent' }}
                              />
                              <Bar 
                                dataKey="Protected Risk" 
                                fill="#10b981" 
                                opacity={0.7}
                                radius={[4, 4, 0, 0]}
                                activeBar={{ opacity: 1, fill: '#10b981' }}
                              />
                              {jobResult.result.raw_metrics?.risk_by_age_group && (
                                <Bar 
                                  dataKey="Raw Risk" 
                                  fill="#666" 
                                  opacity={0.6} 
                                  radius={[4, 4, 0, 0]}
                                  activeBar={{ opacity: 1, fill: '#666' }}
                                />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {jobResult.result.risk_metrics.risk_by_income_bracket && (
                        <div className="pt-4 border-t border-gray-800">
                          <h4 className="text-base font-medium mb-3 text-gray-300 flex items-center gap-2">
                            <TooltipInfo text="Income brackets show how default risk correlates with customer income. Lower income customers typically have higher default risk due to limited financial resources.">
                              By Income Bracket
                            </TooltipInfo>
                          </h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={Object.entries(jobResult.result.risk_metrics.risk_by_income_bracket).map(([bracket, risk]) => ({
                              name: bracket.replace(' (<$50k)', '').replace(' ($50k-$100k)', '').replace(' (>$100k)', ''),
                              'Protected Risk': (risk as number) * 100,
                              'Raw Risk': jobResult.result.raw_metrics?.risk_by_income_bracket?.[bracket] ? (jobResult.result.raw_metrics.risk_by_income_bracket[bracket] * 100) : undefined
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                              <XAxis dataKey="name" stroke="#888" />
                              <YAxis stroke="#888" label={{ value: 'Risk %', angle: -90, position: 'insideLeft' }} />
                              <RechartsTooltip 
                                content={<CustomTooltip />}
                                cursor={{ fill: 'transparent' }}
                              />
                              <Bar 
                                dataKey="Protected Risk" 
                                fill="#10b981" 
                                opacity={0.7}
                                radius={[4, 4, 0, 0]}
                                activeBar={{ opacity: 1, fill: '#10b981' }}
                              />
                              {jobResult.result.raw_metrics?.risk_by_income_bracket && (
                                <Bar 
                                  dataKey="Raw Risk" 
                                  fill="#666" 
                                  opacity={0.6} 
                                  radius={[4, 4, 0, 0]}
                                  activeBar={{ opacity: 1, fill: '#666' }}
                                />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {jobResult.result.risk_metrics.risk_by_employment_status && (
                        <div className="pt-4 border-t border-gray-800">
                          <h4 className="text-base font-medium mb-3 text-gray-300 flex items-center gap-2">
                            <TooltipInfo text="Employment status affects default risk. Unemployed or self-employed customers typically have higher risk due to income instability.">
                              By Employment Status
                            </TooltipInfo>
                          </h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={Object.entries(jobResult.result.risk_metrics.risk_by_employment_status).map(([status, risk]) => ({
                              name: status,
                              'Protected Risk': (risk as number) * 100,
                              'Raw Risk': jobResult.result.raw_metrics?.risk_by_employment_status?.[status] ? (jobResult.result.raw_metrics.risk_by_employment_status[status] * 100) : undefined
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                              <XAxis dataKey="name" stroke="#888" angle={-45} textAnchor="end" height={80} />
                              <YAxis stroke="#888" label={{ value: 'Risk %', angle: -90, position: 'insideLeft' }} />
                              <RechartsTooltip 
                                content={<CustomTooltip />}
                                cursor={{ fill: 'transparent' }}
                              />
                              <Bar 
                                dataKey="Protected Risk" 
                                fill="#10b981" 
                                opacity={0.7}
                                radius={[4, 4, 0, 0]}
                                activeBar={{ opacity: 1, fill: '#10b981' }}
                              />
                              {jobResult.result.raw_metrics?.risk_by_employment_status && (
                                <Bar 
                                  dataKey="Raw Risk" 
                                  fill="#666" 
                                  opacity={0.6} 
                                  radius={[4, 4, 0, 0]}
                                  activeBar={{ opacity: 1, fill: '#666' }}
                                />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Default Probability Estimate */}
                {jobResult.result.risk_metrics.estimated_default_rate !== undefined && (
                  <div className="border border-gray-800 rounded overflow-hidden mb-6">
                    <div className="bg-gray-900 p-4 border-b border-gray-800">
                      <h3 className="font-medium text-base mb-1 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#10b981]" />
                        <TooltipInfo text="The estimated default rate is calculated from the mean risk score. It represents the percentage of customers likely to default on loans. This metric helps banks assess portfolio risk.">
                          Estimated Default Rate
                        </TooltipInfo>
                      </h3>
                      <p className="text-base text-gray-500">Overall portfolio default probability</p>
                    </div>
                    <div className="p-6">
                      <div className="flex items-baseline gap-4 mb-4">
                        {jobResult.result.raw_metrics?.estimated_default_rate !== undefined && (
                          <div className="text-base text-gray-600">
                            Raw: {jobResult.result.raw_metrics.estimated_default_rate.toFixed(1)}%
                          </div>
                        )}
                        <div className={`text-4xl font-light ${
                          jobResult.result.risk_metrics.estimated_default_rate > 30 ? 'text-red-400' :
                          jobResult.result.risk_metrics.estimated_default_rate > 15 ? 'text-yellow-400' :
                          'text-[#10b981]'
                        }`}>
                          {jobResult.result.risk_metrics.estimated_default_rate.toFixed(1)}%
                        </div>
                      </div>
                      <div className="w-full h-8 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            jobResult.result.risk_metrics.estimated_default_rate > 30 ? 'bg-red-400' :
                            jobResult.result.risk_metrics.estimated_default_rate > 15 ? 'bg-yellow-400' :
                            'bg-[#10b981]'
                          }`}
                          style={{ width: `${Math.min(100, jobResult.result.risk_metrics.estimated_default_rate)}%` }}
                        />
                      </div>
                      <p className="text-base text-gray-500 leading-relaxed mt-4">
                        Based on aggregate risk analysis across all customers. This represents the estimated percentage of customers likely to default on loans, protected with Differential Privacy.
                      </p>
                    </div>
                  </div>
                )}

                {/* Customers Count */}
                <div className="border border-gray-800 p-4 rounded bg-gray-900/50 mb-6">
                  <div className="text-base text-gray-400">
                    Total Customers: <span className="text-[#10b981] font-medium">{jobResult.result.risk_metrics.total_customers}</span>
                  </div>
                </div>

                {/* Privacy Budget */}
                <div className="border border-gray-800 p-4 rounded bg-gray-900/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-[#10b981]" />
                    <h4 className="text-base font-medium">Privacy Protection</h4>
                  </div>
                  <div className="space-y-1 text-base">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Privacy Budget (ε):</span>
                      <span className="font-mono">{jobResult.result.privacy_budget.epsilon_per_query}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Budget Used:</span>
                      <span className="font-mono">{jobResult.result.privacy_budget.total_epsilon_simple.toFixed(2)}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <p className="text-base text-gray-500">
                        Each query consumes privacy budget. Lower ε provides stronger privacy guarantees but adds more noise to results.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attestation */}
                {jobResult.attestation && (
                  <div className="border border-gray-800 p-4 rounded bg-gray-900/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-[#10b981]" />
                      <h4 className="text-base font-medium">TEE Attestation</h4>
                    </div>
                    <div className="space-y-2 text-base">
                      <div>
                        <span className="text-gray-500">Signing Address: </span>
                        <span className="font-mono text-gray-400 break-all">{jobResult.attestation.signing_address}</span>
                      </div>
                      <button
                        onClick={handleVerifyAttestation}
                        className="mt-3 w-full bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded text-base transition-colors"
                      >
                        Verify Attestation
                      </button>
                      {attestationVerified !== null && (
                        <div className={`mt-3 p-3 rounded ${attestationVerified ? 'bg-[#10b981]/20 border border-[#10b981]' : 'bg-red-950/30 border border-red-900'}`}>
                          <div className="flex items-center gap-2">
                            {attestationVerified ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-[#10b981]" />
                                <span className="text-base text-[#10b981]">✓ Attestation Verified</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span className="text-base text-red-400">✗ Verification Failed</span>
                              </>
                            )}
                          </div>
                          {verificationDetails && (
                            <div className="mt-2 text-base text-gray-500 space-y-1">
                              {verificationDetails.tdxQuote && (
                                <div>
                                  <p>TDX Quote: {verificationDetails.tdxQuote.verified ? '✓' : '✗'}</p>
                                  {!verificationDetails.tdxQuote.verified && verificationDetails.tdxQuote.note && (
                                    <p className="text-gray-600 italic mt-1">{verificationDetails.tdxQuote.note}</p>
                                  )}
                                </div>
                              )}
                              {verificationDetails.resultSignature && (
                                <div>
                                  <p>Signature: {verificationDetails.resultSignature.verified ? '✓' : '✗'}</p>
                                  {!verificationDetails.resultSignature.verified && (
                                    <div className="mt-1 text-gray-600">
                                      {verificationDetails.resultSignature.error && (
                                        <p className="text-red-400">
                                          Error: {typeof verificationDetails.resultSignature.error === 'string'
                                            ? verificationDetails.resultSignature.error
                                            : verificationDetails.resultSignature.error?.message || JSON.stringify(verificationDetails.resultSignature.error)}
                                        </p>
                                      )}
                                      {verificationDetails.resultSignature.message && (
                                        <p>{typeof verificationDetails.resultSignature.message === 'string'
                                          ? verificationDetails.resultSignature.message
                                          : JSON.stringify(verificationDetails.resultSignature.message)}</p>
                                      )}
                                      {verificationDetails.resultSignature.debug && (
                                        <details className="mt-1">
                                          <summary className="cursor-pointer text-gray-500">Debug info</summary>
                                          <pre className="text-base mt-1 overflow-auto">
                                            {JSON.stringify(verificationDetails.resultSignature.debug, null, 2)}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              {verificationDetails.error && (
                                <p className="text-red-400">
                                  Error: {typeof verificationDetails.error === 'string'
                                    ? verificationDetails.error
                                    : verificationDetails.error?.message || verificationDetails.error?.error || JSON.stringify(verificationDetails.error)}
                                </p>
                              )}
                              {!verificationDetails.tdxQuote?.verified && (
                                <p className="text-gray-600 italic mt-2">
                                  Note: TDX quote verification requires actual TEE hardware and is currently in development for simulation mode.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-base">
            Data is processed inside a <span className="text-[#10b981]">Trusted Execution Environment (TEE)</span> with{' '}
            <span className="text-[#10b981]">Differential Privacy</span> protection. Individual data cannot be reverse-engineered from results.
          </p>
        </footer>
      </div>
    </div>
  )
}
