import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { CurrencyInput, Overlay, useToast } from '../ui';
import { X } from 'lucide-react';
import * as loanAPI from '../../services/api';

const LoanForm = ({ loan = null, onClose, onSuccess }) => {
  const { formatCurrency } = useCurrency();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [emiPreview, setEmiPreview] = useState(null);
  const [formData, setFormData] = useState({
    loanName: '',
    loanType: 'personal',
    principalAmount: '',
    interestRate: '',
    tenure: '',
    tenureUnit: 'months',
    startDate: new Date().toISOString().split('T')[0],
    paymentDay: '1',
    lender: '',
    accountNumber: '',
    processingFee: '',
    prepaymentPenalty: '0',
    insuranceAmount: '',
    notes: ''
  });

  useEffect(() => {
    if (loan) {
      setFormData({
        loanName: loan.loanName,
        loanType: loan.loanType,
        principalAmount: loan.principalAmount.toString(),
        interestRate: loan.interestRate.toString(),
        tenure: loan.tenure.toString(),
        tenureUnit: 'months',
        startDate: new Date(loan.startDate).toISOString().split('T')[0],
        paymentDay: loan.paymentDay?.toString() || '1',
        lender: loan.lender || '',
        accountNumber: loan.accountNumber || '',
        processingFee: loan.processingFee?.toString() || '',
        prepaymentPenalty: loan.prepaymentPenalty?.toString() || '0',
        insuranceAmount: loan.insuranceAmount?.toString() || '',
        notes: loan.notes || ''
      });
    }
  }, [loan]);

  useEffect(() => {
    const calculateEMIPreview = async () => {
      const principalAmount = formData.principalAmount;
      const interestRate = formData.interestRate;
      const tenure = formData.tenure;
      const tenureUnit = formData.tenureUnit;
      
      // Validate that all fields have valid numeric values
      const principal = parseFloat(principalAmount);
      const rate = parseFloat(interestRate);
      const tenureValue = parseInt(tenure);
      
      if (principalAmount && interestRate && tenure && 
          !isNaN(principal) && principal > 0 &&
          !isNaN(rate) && rate > 0 &&
          !isNaN(tenureValue) && tenureValue > 0) {
        try {
          const tenureInMonths = tenureUnit === 'years' ? tenureValue * 12 : tenureValue;
          const response = await loanAPI.calculateEMI(principal, rate, tenureInMonths);
          setEmiPreview(response.calculation);
        } catch {
          setEmiPreview(null);
        }
      } else {
        setEmiPreview(null);
      }
    };

    const debounceTimer = setTimeout(calculateEMIPreview, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.principalAmount, formData.interestRate, formData.tenure, formData.tenureUnit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const principal = parseFloat(formData.principalAmount);
    const rate = parseFloat(formData.interestRate);
    const tenureValue = parseInt(formData.tenure);
    
    if (!formData.loanName || !formData.loanName.trim()) {
      toast.warning('Please enter a loan name');
      return;
    }
    
    if (isNaN(principal) || principal <= 0) {
      toast.warning('Please enter a valid principal amount');
      return;
    }
    
    if (isNaN(rate) || rate <= 0) {
      toast.warning('Please enter a valid interest rate');
      return;
    }
    
    if (isNaN(tenureValue) || tenureValue <= 0) {
      toast.warning('Please enter a valid tenure');
      return;
    }

    setLoading(true);

    try {
      const tenureInMonths = formData.tenureUnit === 'years' 
        ? tenureValue * 12
        : tenureValue;

      const loanData = {
        loanName: formData.loanName,
        loanType: formData.loanType,
        principalAmount: principal,
        interestRate: rate,
        tenure: tenureInMonths,
        startDate: formData.startDate,
        paymentDay: parseInt(formData.paymentDay),
        financialInstitution: formData.lender,
        accountNumber: formData.accountNumber,
        processingFee: formData.processingFee ? parseFloat(formData.processingFee) : 0,
        prepaymentPenalty: formData.prepaymentPenalty ? parseFloat(formData.prepaymentPenalty) : 0,
        insuranceAmount: formData.insuranceAmount ? parseFloat(formData.insuranceAmount) : 0,
        collateral: formData.notes
      };
      
      if (loan) {
        await loanAPI.updateLoan(loan._id, loanData);
      } else {
        await loanAPI.createLoan(loanData);
      }

      // Call success callback before closing
      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Loan save error:', err);
      toast.error('Failed to save loan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay
      isOpen
      onClose={onClose}
      containerClassName="z-[9999]"
      panelClassName="max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-light-border-default dark:border-white/10 bg-light-surface-secondary dark:bg-[#0D1117] shadow-2xl overflow-hidden"
      ariaLabelledBy="loan-form-title"
    >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-light-border-default dark:border-white/10 flex-shrink-0">
          <h2 id="loan-form-title" className="text-2xl font-bold text-light-text-primary dark:text-white">
            {loan ? 'Edit Loan' : 'Add New Loan'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-light-bg-hover dark:hover:bg-white/10 rounded-lg transition-colors text-light-text-secondary dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form id="loan-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Loan Name *
                </label>
                <input
                  type="text"
                  name="loanName"
                  value={formData.loanName}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Home Loan - HDFC"
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Loan Type *
                </label>
                <select
                  name="loanType"
                  value={formData.loanType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                >
                  <option value="home">Home Loan</option>
                  <option value="car">Car Loan</option>
                  <option value="personal">Personal Loan</option>
                  <option value="education">Education Loan</option>
                  <option value="business">Business Loan</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Loan Amount & Terms */}
          <div>
            <h3 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4">
              Loan Amount & Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Principal Amount * ({formatCurrency(0).replace('0', '').trim()})
                </label>
                <CurrencyInput
                  name="principalAmount"
                  value={formData.principalAmount}
                  onChange={handleChange}
                  required
                  placeholder="500000"
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Interest Rate * (% p.a.)
                </label>
                <input
                  type="number"
                  name="interestRate"
                  value={formData.interestRate}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="8.5"
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Tenure *
                </label>
                <input
                  type="number"
                  name="tenure"
                  value={formData.tenure}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="60"
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Tenure Unit *
                </label>
                <select
                  name="tenureUnit"
                  value={formData.tenureUnit}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                >
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Payment Day (1-31)
                </label>
                <input
                  type="number"
                  name="paymentDay"
                  value={formData.paymentDay}
                  onChange={handleChange}
                  min="1"
                  max="31"
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                />
                <p className="text-xs text-light-text-tertiary dark:text-slate-500 mt-1">Day of month for EMI payment</p>
              </div>
            </div>
          </div>

          {/* EMI Preview */}
          {emiPreview && (
            <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 dark:border-blue-500/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">
                EMI Calculation Preview
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Monthly EMI</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(emiPreview.emiAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Total Interest</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(emiPreview.totalInterest)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-light-text-secondary dark:text-slate-400 mb-1">Total Payment</p>
                  <p className="text-lg font-bold text-light-text-primary dark:text-white">
                    {formatCurrency(emiPreview.totalPayment)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lender Information */}
          <div>
            <h3 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4">
              Lender Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Lender / Bank Name
                </label>
                <select
                  name="lender"
                  value={formData.lender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                >
                  <option value="">Select Bank / Lender</option>
                  <optgroup label="Sri Lankan Banks">
                    <option value="Bank of Ceylon">Bank of Ceylon</option>
                    <option value="People's Bank">People's Bank</option>
                    <option value="Commercial Bank of Ceylon">Commercial Bank of Ceylon</option>
                    <option value="Hatton National Bank">Hatton National Bank (HNB)</option>
                    <option value="Sampath Bank">Sampath Bank</option>
                    <option value="National Savings Bank">National Savings Bank</option>
                    <option value="Seylan Bank">Seylan Bank</option>
                    <option value="DFCC Bank">DFCC Bank</option>
                    <option value="Nations Trust Bank">Nations Trust Bank (NTB)</option>
                    <option value="Union Bank of Colombo">Union Bank of Colombo</option>
                    <option value="Pan Asia Banking Corporation">Pan Asia Banking Corporation</option>
                    <option value="Cargills Bank">Cargills Bank</option>
                  </optgroup>
                  <optgroup label="Middle Eastern Banks">
                    <option value="Emirates NBD">Emirates NBD (UAE)</option>
                    <option value="First Abu Dhabi Bank">First Abu Dhabi Bank (FAB)</option>
                    <option value="Abu Dhabi Commercial Bank">Abu Dhabi Commercial Bank (ADCB)</option>
                    <option value="Dubai Islamic Bank">Dubai Islamic Bank</option>
                    <option value="Mashreq Bank">Mashreq Bank (UAE)</option>
                    <option value="Qatar National Bank">Qatar National Bank (QNB)</option>
                    <option value="National Bank of Kuwait">National Bank of Kuwait (NBK)</option>
                    <option value="Al Rajhi Bank">Al Rajhi Bank (Saudi Arabia)</option>
                    <option value="Riyad Bank">Riyad Bank (Saudi Arabia)</option>
                    <option value="Commercial Bank of Dubai">Commercial Bank of Dubai</option>
                  </optgroup>
                  <optgroup label="International / Western Banks">
                    <option value="HSBC">HSBC</option>
                    <option value="Citibank">Citibank</option>
                    <option value="Standard Chartered">Standard Chartered</option>
                    <option value="Barclays">Barclays</option>
                    <option value="Deutsche Bank">Deutsche Bank</option>
                    <option value="BNP Paribas">BNP Paribas</option>
                    <option value="Santander">Santander</option>
                    <option value="Bank of America">Bank of America</option>
                    <option value="Wells Fargo">Wells Fargo</option>
                    <option value="Chase Bank">Chase Bank (JPMorgan)</option>
                    <option value="Scotiabank">Scotiabank</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="other">Other (Enter Custom Name)</option>
                  </optgroup>
                </select>
                {formData.lender === 'other' && (
                  <input
                    type="text"
                    name="customLender"
                    placeholder="Enter lender name"
                    onChange={(e) => setFormData(prev => ({ ...prev, lender: e.target.value }))}
                    className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white mt-2 outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="XXXXXXXXX"
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Additional Charges */}
          <div>
            <h3 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4">
              Additional Charges
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Processing Fee ({formatCurrency(0).replace('0', '').trim()})
                </label>
                <CurrencyInput
                  name="processingFee"
                  value={formData.processingFee}
                  onChange={handleChange}
                  placeholder="5000"
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Prepayment Penalty (%)
                </label>
                <input
                  type="number"
                  name="prepaymentPenalty"
                  value={formData.prepaymentPenalty}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="2"
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                  Insurance Amount ({formatCurrency(0).replace('0', '').trim()})
                </label>
                <CurrencyInput
                  name="insuranceAmount"
                  value={formData.insuranceAmount}
                  onChange={handleChange}
                  placeholder="10000"
                  className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
              Notes / Collateral Details
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Add any additional notes or collateral details..."
              className="w-full px-4 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
            />
          </div>
          </div>
        </form>

        {/* Buttons - Fixed at bottom */}
        <div className="flex gap-3 p-6 border-t border-light-border-default dark:border-white/10 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-light-border-default dark:border-white/10 text-light-text-secondary dark:text-slate-400 rounded-xl hover:bg-light-bg-hover dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="loan-form"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400/50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>{loan ? 'Update Loan' : 'Create Loan'}</>
            )}
          </button>
        </div>
    </Overlay>
  );
};

export default LoanForm;
