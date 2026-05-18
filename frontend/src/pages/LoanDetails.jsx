import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../components/ui';
import * as loanAPI from '../services/api';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Home,
  Car,
  GraduationCap,
  Briefcase,
  User,
  Edit2,
  CreditCard,
  Download,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import LoanForm from '../components/loans/LoanForm';
import RecordPaymentModal from '../components/loans/RecordPaymentModal';
import PaymentHistoryChart from '../components/loans/PaymentHistoryChart';
import { exportAmortizationScheduleToPDF, exportLoanSummaryToPDF } from '../utils/pdfExport';

const LoanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, currency } = useCurrency();
  const toast = useToast();
  const [loan, setLoan] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [extraPaymentAmount, setExtraPaymentAmount] = useState('');
  const [extraPaymentFrequency, setExtraPaymentFrequency] = useState('monthly');
  const [simulation, setSimulation] = useState(null);
  const [payoffDetails, setPayoffDetails] = useState(null);

  const loadLoanDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [loanResponse, scheduleResponse, paymentsResponse] = await Promise.all([
        loanAPI.getLoanById(id),
        loanAPI.getAmortizationSchedule(id),
        loanAPI.getLoanPayments(id)
      ]);
      
      setLoan(loanResponse.loan);
      setSchedule(scheduleResponse.schedule);
      setPayments(paymentsResponse.payments);

      // Load payoff details if loan is active
      if (loanResponse.loan.status === 'active') {
        const payoffRes = await loanAPI.getEarlyPayoffAmount(id);
        setPayoffDetails(payoffRes.payoffDetails);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const loadDetails = async () => {
      await loadLoanDetails();
    };

    loadDetails();
  }, [loadLoanDetails]);

  const handleSimulateExtraPayment = async () => {
    if (!extraPaymentAmount || isNaN(extraPaymentAmount)) {
      toast.warning('Please enter a valid extra payment amount');
      return;
    }

    try {
      const response = await loanAPI.simulateExtraPayment(
        id,
        parseFloat(extraPaymentAmount),
        extraPaymentFrequency
      );
      setSimulation(response.simulation);
    } catch (err) {
      toast.error('Failed to simulate: ' + err.message);
    }
  };

  const handleRecordPayment = async (paymentData) => {
    try {
      await loanAPI.recordLoanPayment(id, paymentData);
      setShowPaymentModal(false);
      loadLoanDetails();
    } catch (err) {
      toast.error('Failed to record payment: ' + err.message);
    }
  };

  const getLoanIcon = (loanType) => {
    const iconMap = {
      home: Home,
      car: Car,
      education: GraduationCap,
      business: Briefcase,
      personal: User,
      other: DollarSign
    };
    return iconMap[loanType] || DollarSign;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="space-y-6 animate-fade-in">
      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-6 py-4 rounded-lg">
          <p className="font-semibold">Error loading loan details</p>
          <p className="text-sm mt-1">{error || 'Loan not found'}</p>
          <button
            onClick={() => navigate('/loans')}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
          >
            Back to Loans
          </button>
        </div>
      </div>
    );
  }

  const Icon = getLoanIcon(loan.loanType);
  const progress = ((loan.principalAmount - loan.remainingBalance) / loan.principalAmount) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/loans')}
          className="p-2 hover:bg-light-bg-hover dark:hover:bg-white/10 rounded-lg transition-colors text-light-text-secondary dark:text-slate-400"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-light-text-primary dark:text-white">
            {loan.loanName}
          </h1>
          <p className="text-light-text-secondary dark:text-slate-400 capitalize">
            {loan.loanType} Loan • {loan.lender || 'No lender specified'}
          </p>
        </div>
        <button
          onClick={() => exportLoanSummaryToPDF(loan, schedule, payments, currency.symbol)}
          className="flex items-center gap-2 px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg hover:bg-light-bg-hover dark:hover:bg-white/10 transition-colors text-light-text-primary dark:text-white"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg hover:bg-light-bg-hover dark:hover:bg-white/10 transition-colors text-light-text-primary dark:text-white"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        {loan.status === 'active' && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Record Payment
          </button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-light-text-secondary dark:text-slate-400">Principal Amount</p>
          </div>
          <p className="text-2xl font-bold text-light-text-primary dark:text-white">
            {formatCurrency(loan.principalAmount)}
          </p>
        </div>

        <div className="rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-light-text-secondary dark:text-slate-400">Monthly EMI</p>
          </div>
          <p className="text-2xl font-bold text-light-text-primary dark:text-white">
            {formatCurrency(loan.emiAmount)}
          </p>
        </div>

        <div className="rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm text-light-text-secondary dark:text-slate-400">Remaining Balance</p>
          </div>
          <p className="text-2xl font-bold text-light-text-primary dark:text-white">
            {formatCurrency(loan.remainingBalance)}
          </p>
        </div>

        <div className="rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm text-light-text-secondary dark:text-slate-400">Total Interest</p>
          </div>
          <p className="text-2xl font-bold text-light-text-primary dark:text-white">
            {formatCurrency(loan.totalInterest)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-premium dark:shadow-card-dark mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-light-text-primary dark:text-white">Repayment Progress</h3>
          <span className="text-sm font-medium text-light-text-secondary dark:text-slate-400">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-light-bg-accent dark:bg-slate-800/90 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all shadow-[0_0_12px_rgba(59,130,246,0.45)]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-light-border-default dark:border-white/10">
          <div>
            <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Paid Amount</p>
            <p className="text-lg font-semibold text-light-text-primary dark:text-white">
              {formatCurrency(loan.principalAmount - loan.remainingBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Interest Rate</p>
            <p className="text-lg font-semibold text-light-text-primary dark:text-white">
              {loan.interestRate}% p.a.
            </p>
          </div>
          <div>
            <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Tenure</p>
            <p className="text-lg font-semibold text-light-text-primary dark:text-white">
              {loan.tenure} months
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-0 shadow-premium dark:shadow-card-dark mb-6 overflow-hidden">
        <div className="border-b border-light-border-default dark:border-white/10">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {['overview', 'schedule', 'payments', 'charts', 'analysis'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-light-text-tertiary dark:text-slate-400 hover:text-light-text-primary dark:hover:text-white hover:border-light-border-strong dark:hover:border-white/20'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4">
                    Loan Details
                  </h4>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-light-text-secondary dark:text-slate-400">Start Date</dt>
                      <dd className="text-sm font-medium text-light-text-primary dark:text-white">
                        {new Date(loan.startDate).toLocaleDateString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-light-text-secondary dark:text-slate-400">End Date</dt>
                      <dd className="text-sm font-medium text-light-text-primary dark:text-white">
                        {new Date(loan.endDate).toLocaleDateString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-light-text-secondary dark:text-slate-400">Payment Day</dt>
                      <dd className="text-sm font-medium text-light-text-primary dark:text-white">
                        {loan.paymentDay ? `${loan.paymentDay} of every month` : 'Not set'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-light-text-secondary dark:text-slate-400">Status</dt>
                      <dd className="text-sm font-medium capitalize text-light-text-primary dark:text-white">{loan.status}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4">
                    Additional Information
                  </h4>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-light-text-secondary dark:text-slate-400">Processing Fee</dt>
                      <dd className="text-sm font-medium text-light-text-primary dark:text-white">
                        {formatCurrency(loan.processingFee || 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-light-text-secondary dark:text-slate-400">Prepayment Penalty</dt>
                      <dd className="text-sm font-medium text-light-text-primary dark:text-white">
                        {loan.prepaymentPenalty || 0}%
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-light-text-secondary dark:text-slate-400">Insurance</dt>
                      <dd className="text-sm font-medium text-light-text-primary dark:text-white">
                        {formatCurrency(loan.insuranceAmount || 0)}
                      </dd>
                    </div>
                    {loan.accountNumber && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-light-text-secondary dark:text-slate-400">Account Number</dt>
                        <dd className="text-sm font-medium text-light-text-primary dark:text-white">
                          {loan.accountNumber}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {loan.collateral && (
                <div>
                  <h4 className="text-lg font-semibold text-light-text-primary dark:text-white mb-2">
                    Notes / Collateral
                  </h4>
                  <p className="text-sm text-light-text-secondary dark:text-slate-400">
                    {loan.collateral}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Amortization Schedule Tab */}
          {activeTab === 'schedule' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-light-text-primary dark:text-white">
                  Amortization Schedule
                </h4>
                <button 
                  onClick={() => exportAmortizationScheduleToPDF(loan, schedule, currency.symbol)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-light-bg-accent dark:bg-white/[0.04]">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-light-text-primary dark:text-white">#</th>
                      <th className="px-4 py-3 text-left font-medium text-light-text-primary dark:text-white">Due Date</th>
                      <th className="px-4 py-3 text-right font-medium text-light-text-primary dark:text-white">EMI</th>
                      <th className="px-4 py-3 text-right font-medium text-light-text-primary dark:text-white">Principal</th>
                      <th className="px-4 py-3 text-right font-medium text-light-text-primary dark:text-white">Interest</th>
                      <th className="px-4 py-3 text-right font-medium text-light-text-primary dark:text-white">Balance</th>
                      <th className="px-4 py-3 text-center font-medium text-light-text-primary dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border-default dark:divide-white/10">
                    {schedule && schedule.slice(0, 12).map((item) => (
                      <tr key={item.paymentNumber} className={item.isPaid ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''}>
                        <td className="px-4 py-3 text-light-text-secondary dark:text-slate-400">{item.paymentNumber}</td>
                        <td className="px-4 py-3 text-light-text-secondary dark:text-slate-400">{new Date(item.paymentDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right text-light-text-secondary dark:text-slate-400">{formatCurrency(item.emiAmount)}</td>
                        <td className="px-4 py-3 text-right text-light-text-secondary dark:text-slate-400">{formatCurrency(item.principalAmount)}</td>
                        <td className="px-4 py-3 text-right text-light-text-secondary dark:text-slate-400">{formatCurrency(item.interestAmount)}</td>
                        <td className="px-4 py-3 text-right font-medium text-light-text-primary dark:text-white">{formatCurrency(item.remainingBalance)}</td>
                        <td className="px-4 py-3 text-center">
                          {item.isPaid ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                            <Clock className="w-5 h-5 text-light-text-tertiary dark:text-slate-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {schedule && schedule.length > 12 && (
                <p className="text-sm text-light-text-secondary dark:text-slate-400 mt-4 text-center">
                  Showing first 12 of {schedule.length} payments
                </p>
              )}
            </div>
          )}

          {/* Payment History Tab */}
          {activeTab === 'payments' && (
            <div>
              <h4 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4">
                Payment History ({payments.length} payments)
              </h4>

              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-light-text-tertiary dark:text-slate-500 mx-auto mb-3" />
                  <p className="text-light-text-secondary dark:text-slate-400">No payments recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment._id}
                      className="flex items-center justify-between p-4 bg-light-bg-accent dark:bg-white/[0.03] border border-light-border-default dark:border-white/10 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium text-light-text-primary dark:text-white">
                            Payment #{payment.paymentNumber}
                          </p>
                          <p className="text-sm text-light-text-secondary dark:text-slate-400">
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-light-text-primary dark:text-white">
                          {formatCurrency(payment.paymentAmount)}
                        </p>
                        <p className="text-xs text-light-text-secondary dark:text-slate-400">
                          Principal: {formatCurrency(payment.principalPaid)} • 
                          Interest: {formatCurrency(payment.interestPaid)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Charts Tab */}
          {activeTab === 'charts' && (
            <PaymentHistoryChart 
              payments={payments}
              schedule={schedule}
              loan={loan}
            />
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && loan.status === 'active' && (
            <div className="space-y-6">
              {/* Early Payoff */}
              {payoffDetails && (
                <div>
                  <h4 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4">
                    Early Payoff Calculator
                  </h4>
                  <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 border border-light-border-default dark:border-white/10 p-6 rounded-lg">
                    <p className="text-sm text-light-text-secondary dark:text-slate-400 mb-4">
                      Pay off your loan today with the following amount:
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-center md:text-left">
                      <div>
                        <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Outstanding Balance</p>
                        <p className="text-xl font-bold text-light-text-primary dark:text-white">
                          {formatCurrency(payoffDetails.remainingBalance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Prepayment Penalty</p>
                        <p className="text-xl font-bold text-rose-500">
                          {formatCurrency(payoffDetails.prepaymentPenalty)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Total Payoff Amount</p>
                        <p className="text-2xl font-bold text-blue-500">
                          {formatCurrency(payoffDetails.totalPayoffAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Extra Payment Simulator */}
              <div>
                <h4 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4">
                  Extra Payment Simulator
                </h4>
                <div className="bg-light-bg-accent dark:bg-white/[0.03] border border-light-border-default dark:border-white/10 p-6 rounded-lg">
                  <p className="text-sm text-light-text-secondary dark:text-slate-400 mb-4">
                    See how extra payments can help you save on interest and pay off your loan faster
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input
                      type="number"
                      placeholder={`Extra amount (${formatCurrency(0).replace('0', '').trim()})`}
                      value={extraPaymentAmount}
                      onChange={(e) => setExtraPaymentAmount(e.target.value)}
                      className="px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <select
                      value={extraPaymentFrequency}
                      onChange={(e) => setExtraPaymentFrequency(e.target.value)}
                      className="px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="one-time">One-time</option>
                    </select>
                    <button
                      onClick={handleSimulateExtraPayment}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Simulate
                    </button>
                  </div>

                  {simulation && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-light-surface-primary dark:bg-white/[0.03] border border-light-border-default dark:border-white/10 rounded-lg">
                      <div>
                        <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Months Saved</p>
                        <p className="text-2xl font-bold text-emerald-500">
                          {simulation.monthsSaved}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Interest Saved</p>
                        <p className="text-2xl font-bold text-blue-500">
                          {formatCurrency(simulation.interestSaved)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">New Tenure</p>
                        <p className="text-2xl font-bold text-light-text-primary dark:text-white">
                          {simulation.newTenure} mo
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">New Interest</p>
                        <p className="text-2xl font-bold text-light-text-primary dark:text-white">
                          {formatCurrency(simulation.newTotalInterest)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <LoanForm
          loan={loan}
          onClose={() => setShowEditModal(false)}
          onSuccess={loadLoanDetails}
        />
      )}

      {showPaymentModal && (
        <RecordPaymentModal
          loan={loan}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handleRecordPayment}
        />
      )}
    </div>
  );
};

export default LoanDetails;
