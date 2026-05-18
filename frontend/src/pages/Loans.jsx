import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { Overlay, useToast } from '../components/ui';
import * as loanAPI from '../services/api';
import { getStoredAuthSnapshot } from '../utils/authStorage';
import {
  Plus,
  Home,
  Car,
  GraduationCap,
  Briefcase,
  User,
  Filter,
  Search,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  CreditCard,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoanForm from '../components/loans/LoanForm';
import RecordPaymentModal from '../components/loans/RecordPaymentModal';

const Loans = ({ openAddSignal = 0, openExportSignal = 0, onSummaryChange = null }) => {
  const { formatCurrency } = useCurrency();
  const toast = useToast();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('nextPaymentDate');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // Load loans
  const loadLoans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // If this is a guest session, don't call protected loans API.
      // Guests do not have loans in the DB and many backend queries expect a real user id.
      const { isGuest } = getStoredAuthSnapshot();
      if (isGuest) {
        setLoans([]);
        if (typeof onSummaryChange === 'function') {
          onSummaryChange({});
        }
        setLoading(false);
        return;
      }
      setError(null);
      // Only pass status filter if it's not 'all'
      const filters = {};
      if (filterStatus && filterStatus !== 'all') {
        filters.status = filterStatus;
      }
      const response = await loanAPI.getLoans(filters);
      console.log('Loans response:', response);
      setLoans(response.loans || []);
      if (typeof onSummaryChange === 'function') {
        onSummaryChange(response.summary || {});
      }
    } catch (err) {
      console.error('Load loans error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, onSummaryChange]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  useEffect(() => {
    if (openAddSignal > 0) {
      setShowAddModal(true);
    }
  }, [openAddSignal]);

  const filteredLoans = useMemo(() => (
    loans.filter((loan) => {
      const matchesSearch = loan.loanName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || loan.status === filterStatus;
      const matchesType = filterType === 'all' || loan.loanType === filterType;
      return matchesSearch && matchesStatus && matchesType;
    })
  ), [loans, searchTerm, filterStatus, filterType]);

  const sortedLoans = useMemo(() => (
    [...filteredLoans].sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.principalAmount - a.principalAmount;
        case 'emi':
          return b.emiAmount - a.emiAmount;
        case 'balance':
          return b.remainingBalance - a.remainingBalance;
        case 'nextPaymentDate':
          return new Date(a.nextPaymentDate || 0) - new Date(b.nextPaymentDate || 0);
        default:
          return 0;
      }
    })
  ), [filteredLoans, sortBy]);

  const exportLoansCsv = useCallback(() => {
    if (sortedLoans.length === 0) return;

    const rows = [
      ['Loan Name', 'Type', 'Status', 'Principal Amount', 'EMI Amount', 'Remaining Balance', 'Interest Rate', 'Tenure Months', 'Next Payment Date'],
      ...sortedLoans.map((loan) => [
        loan.loanName,
        loan.loanType,
        loan.status,
        Number(loan.principalAmount || 0),
        Number(loan.emiAmount || 0),
        Number(loan.remainingBalance || 0),
        Number(loan.interestRate || 0),
        Number(loan.tenure || 0),
        loan.nextPaymentDate ? new Date(loan.nextPaymentDate).toISOString().split('T')[0] : '',
      ]),
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `loans-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [sortedLoans]);

  useEffect(() => {
    if (openExportSignal > 0) {
      exportLoansCsv();
    }
  }, [openExportSignal, exportLoansCsv]);

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-blue-500 bg-blue-500/10 border border-blue-500/20';
      case 'paid':
        return 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20';
      case 'closed':
        return 'text-slate-400 bg-white/5 border border-white/10';
      case 'defaulted':
        return 'text-rose-500 bg-rose-500/10 border border-rose-500/20';
      default:
        return 'text-slate-400 bg-white/5 border border-white/10';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return Clock;
      case 'paid':
        return CheckCircle2;
      case 'defaulted':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const calculateDaysUntilDue = (nextPaymentDate) => {
    if (!nextPaymentDate) return null;
    const today = new Date();
    const dueDate = new Date(nextPaymentDate);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleDelete = async () => {
    if (!loanToDelete) return;

    try {
      await loanAPI.deleteLoan(loanToDelete._id);
      setLoans(loans.filter(l => l._id !== loanToDelete._id));
      closeDeleteModal();
    } catch (err) {
      toast.error('Failed to delete loan: ' + err.message);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setLoanToDelete(null);
  };

  const handleRecordPayment = async (paymentData) => {
    if (!selectedLoan) return;

    try {
      await loanAPI.recordPayment(selectedLoan._id, paymentData);
      // Reload loans to get updated data
      await loadLoans();
      setShowPaymentModal(false);
      setSelectedLoan(null);
    } catch (err) {
      console.error('Error recording payment:', err);
      throw err; // Re-throw to be handled by the modal
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-3 shadow-premium dark:shadow-card-dark">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search loans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] py-2 pl-10 pr-3 text-sm text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-sm text-light-text-primary dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paid">Paid Off</option>
            <option value="closed">Closed</option>
            <option value="defaulted">Defaulted</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-sm text-light-text-primary dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Types</option>
            <option value="home">Home Loan</option>
            <option value="car">Car Loan</option>
            <option value="personal">Personal Loan</option>
            <option value="education">Education Loan</option>
            <option value="business">Business Loan</option>
            <option value="other">Other</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-sm text-light-text-primary dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="nextPaymentDate">Next Payment</option>
            <option value="amount">Loan Amount</option>
            <option value="emi">EMI Amount</option>
            <option value="balance">Remaining Balance</option>
          </select>

          <div className="flex items-center justify-center rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-xs font-semibold text-light-text-tertiary dark:text-slate-300">
            Dense Tools Filter Bar
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-300">
          {error}
        </div>
      )}

      {/* Loans Grid */}
      {sortedLoans.length === 0 ? (
        <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-12 text-center shadow-premium dark:shadow-card-dark">
          <CreditCard className="mx-auto mb-4 h-16 w-16 text-slate-500" />
          <h3 className="mb-2 text-lg font-semibold text-light-text-primary dark:text-white">
            No loans found
          </h3>
          <p className="mb-4 text-light-text-secondary dark:text-slate-400">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first loan'}
          </p>
          {!searchTerm && filterStatus === 'all' && filterType === 'all' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Add Your First Loan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedLoans.map((loan) => {
            const Icon = getLoanIcon(loan.loanType);
            const StatusIcon = getStatusIcon(loan.status);
            const progress = ((loan.principalAmount - loan.remainingBalance) / loan.principalAmount) * 100;
            const daysUntilDue = calculateDaysUntilDue(loan.nextPaymentDate);

            return (
              <div
                key={loan._id}
                className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-premium transition-all hover:shadow-2xl hover:border-light-border-strong dark:hover:border-white/20"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-3 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                      <Icon className="h-6 w-6 text-blue-500 dark:text-blue-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-light-text-primary dark:text-white">
                        {loan.loanName}
                      </h3>
                      <p className="text-sm capitalize text-light-text-secondary dark:text-slate-400">
                        {loan.loanType} Loan
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                      <StatusIcon className="w-3 h-3" />
                      {loan.status}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-light-text-secondary dark:text-slate-400">Progress</span>
                    <span className="font-medium text-light-text-primary dark:text-slate-100">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-light-bg-accent dark:bg-[#111827]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.45)',
                      }}
                    />
                  </div>
                </div>

                {/* Loan Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="mb-1 text-xs text-light-text-secondary dark:text-slate-400">EMI Amount</p>
                    <p className="text-lg font-bold text-light-text-primary dark:text-white">
                      {formatCurrency(loan.emiAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-light-text-secondary dark:text-slate-400">Remaining Balance</p>
                    <p className="text-lg font-bold text-light-text-primary dark:text-white">
                      {formatCurrency(loan.remainingBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-light-text-secondary dark:text-slate-400">Interest Rate</p>
                    <p className="text-sm font-medium text-light-text-primary dark:text-slate-100">
                      {loan.interestRate}% p.a.
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-light-text-secondary dark:text-slate-400">Tenure</p>
                    <p className="text-sm font-medium text-light-text-primary dark:text-slate-100">
                      {loan.tenure} months
                    </p>
                  </div>
                </div>

                {/* Next Payment */}
                {loan.status === 'active' && loan.nextPaymentDate && (
                  <div className={`p-3 rounded-lg mb-4 border transition-colors ${
                    daysUntilDue < 0 ? 'bg-rose-500/10 border-rose-400/30' :
                    daysUntilDue <= 3 ? 'bg-amber-500/10 border-amber-400/30' :
                    'bg-light-bg-accent dark:bg-white/[0.03] border-light-border-default dark:border-white/10'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${
                          daysUntilDue < 0 ? 'text-rose-400 dark:text-rose-300' :
                          daysUntilDue <= 3 ? 'text-amber-400 dark:text-amber-300' :
                          'text-light-text-tertiary dark:text-slate-300'
                        }`} />
                        <span className="text-sm font-medium text-light-text-primary dark:text-white">
                          Next Payment
                        </span>
                      </div>
                      <span className={`text-sm font-medium ${
                        daysUntilDue < 0 ? 'text-rose-400 dark:text-rose-300' :
                        daysUntilDue <= 3 ? 'text-amber-400 dark:text-amber-300' :
                        'text-light-text-primary dark:text-slate-100'
                      }`}>
                        {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                         daysUntilDue === 0 ? 'Due today' :
                         `Due in ${daysUntilDue} days`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-light-text-tertiary dark:text-slate-400">
                      {new Date(loan.nextPaymentDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {loan.status === 'active' && (
                    <button
                      onClick={() => {
                        setSelectedLoan(loan);
                        setShowPaymentModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                    >
                      <CreditCard className="w-4 h-4" />
                      Record Payment
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/loans/${loan._id}`)}
                    className={`${loan.status === 'active' ? 'flex-1' : 'flex-[2]'} flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/20`}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  <button
                    onClick={() => {
                      setLoanToDelete(loan);
                      setShowDeleteModal(true);
                    }}
                    className="rounded-xl border border-rose-400/40 px-4 py-2 text-rose-500 dark:text-rose-300 transition-all hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Overlay
          isOpen={showDeleteModal}
          onClose={closeDeleteModal}
          containerClassName="z-[9999]"
          panelClassName="max-w-md"
          ariaLabelledBy="loan-delete-modal-title"
        >
          <div className="w-full rounded-2xl border border-light-border-default dark:border-white/10 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-light-text-primary dark:text-white">
              <span id="loan-delete-modal-title">Delete Loan</span>
            </h3>
            <p className="mb-6 text-light-text-secondary dark:text-slate-400">
              Are you sure you want to delete "{loanToDelete?.loanName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 rounded-xl border border-light-border-default dark:border-white/10 px-4 py-2 text-light-text-secondary dark:text-slate-200 transition-all hover:bg-light-bg-hover dark:hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-white transition-all hover:bg-rose-700 shadow-lg shadow-rose-500/20"
              >
              Delete Loan
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Add/Edit Loan Modal */}
      {showAddModal && (
        <LoanForm
          onClose={() => setShowAddModal(false)}
          onSuccess={loadLoans}
        />
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedLoan && (
        <RecordPaymentModal
          loan={selectedLoan}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedLoan(null);
          }}
          onSuccess={handleRecordPayment}
        />
      )}
    </div>
  );
};

export default Loans;
