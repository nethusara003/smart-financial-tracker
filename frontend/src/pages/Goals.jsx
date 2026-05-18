import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '../context/CurrencyContext';
import * as goalAPI from '../services/api';
import { queryKeys } from '../hooks/queryKeys';
import {
  Target,
  TrendingUp,
  Plus,
  Download,
  Edit2,
  Trash2,
  Home,
  Plane,
  GraduationCap,
  Heart,
  Briefcase,
  PiggyBank,
  Calendar,
  DollarSign,
  Trophy,
  CheckCircle2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { CurrencyInput, Overlay } from '../components/ui';
import SystemPageHeader from '../components/layout/SystemPageHeader';

const Goals = () => {
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, completed, overdue
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [contributionGoal, setContributionGoal] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: new Date().toISOString().split('T')[0],
    category: 'savings',
    icon: 'PiggyBank',
    color: 'primary'
  });

  // Load goals from API
  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await goalAPI.getGoals();
      // Convert date strings back to Date objects and map icons
      const processedGoals = data.map(goal => ({
        ...goal,
        id: goal._id,
        targetDate: new Date(goal.targetDate),
        icon: getIconComponent(goal.icon)
      }));
      setGoals(processedGoals);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const getIconComponent = (iconName) => {
    const iconMap = {
      PiggyBank,
      Home,
      Plane,
      GraduationCap,
      Briefcase,
      Heart,
      Target,
      TrendingUp
    };
    return iconMap[iconName] || PiggyBank;
  };

  // Calculate statistics
  const getGoalStats = () => {
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

    return {
      active: activeGoals.length,
      completed: completedGoals.length,
      total: goals.length,
      totalTarget,
      totalSaved,
      overallProgress
    };
  };

  const stats = getGoalStats();

  // Calculate progress for a goal
  const getProgress = (goal) => {
    return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  };

  // Check if goal is overdue
  const isOverdue = (goal) => {
    const today = new Date();
    return goal.targetDate < today && goal.status !== 'completed';
  };

  // Get days remaining
  const getDaysRemaining = (targetDate) => {
    const today = new Date();
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filter goals
  const getFilteredGoals = () => {
    if (filterStatus === 'all') return goals;
    if (filterStatus === 'completed') return goals.filter(g => g.status === 'completed');
    if (filterStatus === 'overdue') return goals.filter(g => isOverdue(g));
    return goals.filter(g => g.status === 'active' && !isOverdue(g));
  };

  const filteredGoals = getFilteredGoals();

  const handleDelete = (goal) => {
    setGoalToDelete(goal);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (goalToDelete) {
      try {
        await goalAPI.deleteGoal(goalToDelete._id || goalToDelete.id);
        setGoals(goals.filter(g => g.id !== goalToDelete.id));
        setGoalToDelete(null);
        setShowDeleteModal(false);
      } catch (err) {
        console.error('Failed to delete goal:', err);
        setError(err.message);
      }
    }
  };

  const cancelDelete = () => {
    setGoalToDelete(null);
    setShowDeleteModal(false);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate.toISOString().split('T')[0],
      category: goal.category,
      icon: goal.icon.name || 'PiggyBank',
      color: goal.color
    });
    setShowModal(true);
  };

  const handleSaveGoal = async () => {
    try {
      const goalData = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount) || 0,
        targetDate: formData.targetDate,
        category: formData.category,
        icon: formData.icon,
        color: formData.color,
        priority: 'medium',
        status: 'active'
      };

      if (editingGoal) {
        // Update existing goal
        const updatedGoal = await goalAPI.updateGoal(editingGoal._id || editingGoal.id, goalData);
        setGoals(goals.map(g => 
          g.id === editingGoal.id
            ? {
                ...updatedGoal,
                id: updatedGoal._id,
                targetDate: new Date(updatedGoal.targetDate),
                icon: getIconComponent(updatedGoal.icon)
              }
            : g
        ));
      } else {
        // Add new goal
        const newGoal = await goalAPI.createGoal(goalData);
        const processedGoal = {
          ...newGoal,
          id: newGoal._id,
          targetDate: new Date(newGoal.targetDate),
          icon: getIconComponent(newGoal.icon)
        };
        setGoals([...goals, processedGoal]);
      }
      
      setShowModal(false);
      setEditingGoal(null);
    } catch (err) {
      console.error('Failed to save goal:', err);
      setError(err.message);
    }
  };

  const cancelEdit = () => {
    setShowModal(false);
    setEditingGoal(null);
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: new Date().toISOString().split('T')[0],
      category: 'savings',
      icon: 'PiggyBank',
      color: 'primary'
    });
  };

  const handleAddContribution = async (goalId, amount) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      const result = await goalAPI.addContribution(goal._id || goal.id, amount);

      // The backend now returns { goal, transaction }
      // Support both the old shape (plain goal) and the new shape
      const updatedGoal = result?.goal ?? result;

      setGoals(goals.map(g => 
        g.id === goalId 
          ? { 
              ...g, 
              currentAmount: updatedGoal.currentAmount,
              status: updatedGoal.status
            }
          : g
      ));

      // Invalidate the transactions cache so the new linked expense
      // appears on the Transactions page immediately
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    } catch (err) {
      console.error('Failed to add contribution:', err);
      setError(err.message);
    }
  };

  const openContributionModal = (goal) => {
    setContributionGoal(goal);
    setContributionAmount('');
    setShowContributionModal(true);
  };

  const confirmContribution = async () => {
    if (contributionGoal && contributionAmount && !isNaN(contributionAmount)) {
      await handleAddContribution(contributionGoal.id, parseFloat(contributionAmount));
      setShowContributionModal(false);
      setContributionGoal(null);
      setContributionAmount('');
    }
  };

  const cancelContribution = () => {
    setShowContributionModal(false);
    setContributionGoal(null);
    setContributionAmount('');
  };

  const openAddGoalModal = () => {
    setEditingGoal(null);
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: new Date().toISOString().split('T')[0],
      category: 'savings',
      icon: 'PiggyBank',
      color: 'primary'
    });
    setShowModal(true);
  };

  const exportGoalsCsv = () => {
    if (goals.length === 0) {
      return;
    }

    const rows = [
      ['Goal Name', 'Category', 'Current Amount', 'Target Amount', 'Progress %', 'Status', 'Target Date'],
      ...goals.map((goal) => [
        goal.name,
        goal.category,
        goal.currentAmount,
        goal.targetAmount,
        getProgress(goal),
        goal.status,
        goal.targetDate.toISOString().split('T')[0]
      ])
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financial-goals-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SystemPageHeader
        tagline="DETERMINISTIC TRACKING"
        title="Financial Goals"
        subtitle="Track and achieve your financial aspirations with deterministic milestones."
        actions={(
          <>
            <button
              type="button"
              onClick={exportGoalsCsv}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-white shadow-sm transition hover:bg-slate-50 dark:hover:border-white/20 dark:hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              Export Goals
            </button>

            <button
              type="button"
              onClick={openAddGoalModal}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-white shadow-sm transition hover:bg-slate-50 dark:hover:border-white/20 dark:hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              Add Goal
            </button>
          </>
        )}
      />

      <section className="rounded-2xl border border-white/5 bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark">
        <div className="flex flex-wrap gap-3 xl:flex-nowrap">
          <div className="flex h-[88px] min-w-[200px] flex-1 items-center justify-between rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 shadow-[0_0_24px_rgba(59,130,246,0.18)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Overall Progress</p>
              <p className="mt-1 text-lg font-bold text-white">{stats.overallProgress}%</p>
              <p className="text-xs text-blue-100/80">{formatCurrency(stats.totalSaved)} of {formatCurrency(stats.totalTarget)}</p>
            </div>
            <Trophy className="h-4 w-4 text-blue-200" />
          </div>

          <div className="flex h-[88px] min-w-[170px] flex-1 items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Active Goals</p>
              <p className="mt-1 text-lg font-bold text-white">{stats.active}</p>
              <p className="text-xs text-slate-400">In progress</p>
            </div>
            <Target className="h-4 w-4 text-slate-200" />
          </div>

          <div className="flex h-[88px] min-w-[170px] flex-1 items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 shadow-[0_0_24px_rgba(16,185,129,0.18)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Completed</p>
              <p className="mt-1 text-lg font-bold text-white">{stats.completed}</p>
              <p className="text-xs text-emerald-100/80">Achievements</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-emerald-200" />
          </div>

          <div className="flex h-[88px] min-w-[170px] flex-1 items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Total Goals</p>
              <p className="mt-1 text-lg font-bold text-white">{stats.total}</p>
              <p className="text-xs text-slate-400">All time</p>
            </div>
            <TrendingUp className="h-4 w-4 text-slate-200" />
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <div className="rounded-xl border border-white/5 bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Filter:</span>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All Goals', count: goals.length },
              { value: 'active', label: 'Active', count: stats.active },
              { value: 'completed', label: 'Completed', count: stats.completed },
              { value: 'overdue', label: 'Overdue', count: goals.filter(g => isOverdue(g)).length }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  filterStatus === filter.value
                    ? 'bg-blue-500/80 text-white shadow-[0_0_16px_rgba(59,130,246,0.35)]'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 rounded-xl border border-white/5 bg-[#0D1117] p-8 text-center shadow-premium dark:shadow-card-dark">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-3"></div>
            <p className="font-medium text-slate-200">Loading goals...</p>
          </div>
        ) : error ? (
          <div className="col-span-2 rounded-xl border border-white/5 bg-[#0D1117] p-8 text-center shadow-premium dark:shadow-card-dark">
            <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-3" />
            <p className="text-danger-600 dark:text-danger-400 font-medium">Failed to load goals</p>
            <p className="mt-1 text-sm text-slate-400">{error}</p>
            <button
              onClick={loadGoals}
              className="mt-3 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Retry
            </button>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-white/5 bg-[#0D1117] p-8 text-center shadow-premium dark:shadow-card-dark">
            <Target className="mx-auto mb-3 h-12 w-12 text-slate-500" />
            <p className="font-medium text-slate-200">No goals in this category</p>
            <p className="mt-1 text-sm text-slate-400">Start by creating a new financial goal</p>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const IconComponent = goal.icon;
            const progress = getProgress(goal);
            const daysRemaining = getDaysRemaining(goal.targetDate);
            const isGoalOverdue = isOverdue(goal);
            const isCompleted = goal.status === 'completed';

            return (
              <div
                key={goal.id}
                className={`group rounded-xl border bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl ${
                  isCompleted
                    ? 'border-emerald-400/35'
                    : isGoalOverdue
                    ? 'border-danger-500/40'
                    : 'border-white/5'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg border p-2 ${
                      isCompleted
                        ? 'border-emerald-400/30 bg-emerald-500/10'
                        : isGoalOverdue
                        ? 'border-danger-400/30 bg-danger-500/10'
                        : 'border-blue-400/30 bg-blue-500/10'
                    }`}>
                      <IconComponent className={`w-5 h-5 ${
                        isCompleted
                          ? 'text-emerald-300'
                          : isGoalOverdue
                          ? 'text-danger-300'
                          : 'text-blue-300'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{goal.name}</h3>
                      <p className="text-xs text-slate-400">{goal.category}</p>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  {isCompleted && (
                    <div className="px-2 py-1 rounded-full bg-success-100 dark:bg-success-900/30 border border-success-200 dark:border-success-500/30">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-success-600 dark:text-success-400" />
                        <span className="text-xs font-semibold text-success-700 dark:text-success-400">Completed</span>
                      </div>
                    </div>
                  )}
                  {isGoalOverdue && !isCompleted && (
                    <div className="px-2 py-1 rounded-full bg-danger-100 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-500/30">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-danger-600 dark:text-danger-400" />
                        <span className="text-xs font-semibold text-danger-700 dark:text-danger-400">Overdue</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount Info */}
                <div className="mb-3">
                  <div className="flex items-baseline justify-between mb-1">
                    <div>
                      <p className="mb-0.5 text-xs text-slate-400">Current Amount</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(goal.currentAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="mb-0.5 text-xs text-slate-400">Target</p>
                      <p className="text-base font-bold text-white">{formatCurrency(goal.targetAmount)}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-400">Progress</span>
                    <span className={`text-xs font-bold ${
                      isCompleted
                        ? 'text-emerald-300'
                        : progress >= 75
                        ? 'text-emerald-300'
                        : progress >= 50
                        ? 'text-warning-300'
                        : 'text-blue-300'
                    }`}>
                      {progress}%
                    </span>
                  </div>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-[#111827]">
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : progress >= 75
                          ? 'bg-emerald-500'
                          : progress >= 50
                          ? 'bg-yellow-500'
                          : 'bg-blue-600'
                      }`}
                      style={{
                        inlineSize: `${progress}%`,
                        boxShadow: isCompleted ? '0 0 10px rgba(16,185,129,0.45)' : progress >= 75 ? '0 0 10px rgba(16,185,129,0.35)' : '0 0 8px rgba(59,130,246,0.35)'
                      }}
                    />
                  </div>
                </div>

                {/* Meta Info */}
                <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{goal.targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  {!isCompleted && (
                    <span className={`font-semibold ${
                      isGoalOverdue
                        ? 'text-danger-600 dark:text-danger-400'
                        : daysRemaining <= 30
                        ? 'text-warning-600 dark:text-warning-400'
                        : 'text-light-text-secondary dark:text-dark-text-secondary'
                    }`}>
                      {isGoalOverdue
                        ? `${Math.abs(daysRemaining)}d overdue`
                        : `${daysRemaining}d remaining`
                      }
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {!isCompleted && (
                    <button
                      onClick={() => openContributionModal(goal)}
                      className="flex-1 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
                      title="Add contribution"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Add Contribution
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(goal)}
                    className="rounded-lg bg-white/[0.04] p-2 transition-colors hover:bg-white/[0.08]"
                    title="Edit goal"
                  >
                    <Edit2 className="h-4 w-4 text-slate-300" />
                  </button>
                  <button
                    onClick={() => handleDelete(goal)}
                    className="group/delete rounded-lg bg-white/[0.04] p-2 transition-colors hover:bg-danger-900/25"
                    title="Delete goal"
                  >
                    <Trash2 className="h-4 w-4 text-slate-300 group-hover/delete:text-danger-300" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Premium Edit/Add Goal Modal */}
      {showModal && (
        <Overlay
          isOpen={showModal}
          onClose={cancelEdit}
          panelClassName="max-w-md"
          ariaLabelledBy="goal-modal-title"
        >
          <div className="rounded-2xl shadow-2xl w-full transform animate-scale-in" style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Modal Header — dark gradient matching dashboard header band */}
            <div className="relative overflow-hidden rounded-t-2xl p-6" style={{ background: 'linear-gradient(135deg, #0F172A, #020617)' }}>
              <div className="relative flex items-center gap-3">
                <div className="p-2 rounded-lg border" style={{ background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.30)' }}>
                  <Target className="w-5 h-5" style={{ color: '#3B82F6' }} />
                </div>
                <h3 id="goal-modal-title" className="text-xl font-bold" style={{ color: '#F9FAFB' }}>
                  {editingGoal ? 'Edit Goal' : 'Add New Goal'}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4" style={{ background: '#0D1117' }}>
              {/* Goal Name */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#F9FAFB' }}>
                  Goal Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ background: '#111722', borderColor: 'rgba(255,255,255,0.08)', color: '#F9FAFB' }}
                  className="w-full px-4 py-3 rounded-lg border placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
                  placeholder="Enter goal name"
                />
              </div>

              {/* Target Amount */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#F9FAFB' }}>
                  Target Amount
                </label>
                <CurrencyInput
                  name="targetAmount"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  style={{ background: '#111722', borderColor: 'rgba(255,255,255,0.08)', color: '#F9FAFB' }}
                  className="w-full px-4 py-3 rounded-lg border placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
                  placeholder="Enter target amount"
                />
              </div>

              {/* Current Amount */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#F9FAFB' }}>
                  Current Amount
                </label>
                <CurrencyInput
                  name="currentAmount"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                  style={{ background: '#111722', borderColor: 'rgba(255,255,255,0.08)', color: '#F9FAFB' }}
                  className="w-full px-4 py-3 rounded-lg border placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
                  placeholder="Enter current amount"
                />
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#F9FAFB' }}>
                  Target Date
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  style={{ background: '#111722', borderColor: 'rgba(255,255,255,0.08)', color: '#F9FAFB' }}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#F9FAFB' }}>
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ background: '#111722', borderColor: 'rgba(255,255,255,0.08)', color: '#F9FAFB' }}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
                >
                  <option value="savings">Savings</option>
                  <option value="housing">Housing</option>
                  <option value="travel">Travel</option>
                  <option value="education">Education</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-6 flex gap-3" style={{ background: '#0D1117', borderRadius: '0 0 1rem 1rem' }}>
              <button
                onClick={cancelEdit}
                className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200"
                style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.10)', color: '#9CA3AF' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                disabled={!formData.name || !formData.targetAmount}
                className="flex-1 px-4 py-3 rounded-lg text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#3B82F6' }}
              >
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Premium Delete Confirmation Modal */}
      {showDeleteModal && goalToDelete && (
        <Overlay
          isOpen={showDeleteModal && Boolean(goalToDelete)}
          onClose={cancelDelete}
          panelClassName="max-w-md"
          ariaLabelledBy="goal-delete-modal-title"
        >
          <div className="bg-light-surface-primary dark:bg-dark-surface-primary rounded-2xl shadow-2xl border border-light-border-default dark:border-dark-border-strong w-full transform animate-scale-in">
            {/* Modal Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-danger-500 to-danger-600 dark:from-danger-600/90 dark:to-danger-700 rounded-t-2xl p-6">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
              <div className="relative flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg border border-white/30">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h3 id="goal-delete-modal-title" className="text-xl font-bold text-white">Confirm Delete</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-light-text-primary dark:text-dark-text-primary text-base leading-relaxed">
                Are you sure you want to delete the goal{' '}
                <span className="font-bold text-danger-600 dark:text-danger-400">"{goalToDelete.name}"</span>?
              </p>
              <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm mt-2">
                This action cannot be undone. All progress data will be permanently lost.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 rounded-lg border border-light-border-default dark:border-dark-border-default text-light-text-primary dark:text-dark-text-primary bg-light-surface-secondary dark:bg-dark-surface-secondary hover:bg-light-surface-hover dark:hover:bg-dark-surface-hover font-semibold transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-lg bg-danger-500 hover:bg-danger-600 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Goal
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Premium Add Contribution Modal */}
      {showContributionModal && contributionGoal && (
        <Overlay
          isOpen={showContributionModal && Boolean(contributionGoal)}
          onClose={cancelContribution}
          panelClassName="max-w-md"
          ariaLabelledBy="goal-contribution-modal-title"
        >
          <div className="bg-light-surface-primary dark:bg-dark-surface-primary rounded-2xl shadow-2xl border border-light-border-default dark:border-dark-border-strong w-full transform animate-scale-in">
            {/* Modal Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-success-500 to-success-600 dark:from-success-600/90 dark:to-success-700 rounded-t-2xl p-6">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
              <div className="relative flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg border border-white/30">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 id="goal-contribution-modal-title" className="text-xl font-bold text-white">Add Contribution</h3>
                  <p className="text-white/80 text-sm">{contributionGoal.name}</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-4">
                <div className="flex justify-between text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                  <span>Current: {formatCurrency(contributionGoal.currentAmount)}</span>
                  <span>Target: {formatCurrency(contributionGoal.targetAmount)}</span>
                </div>
                <div className="w-full bg-light-bg-secondary dark:bg-dark-surface-secondary rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-success-500 to-success-600"
                    style={{ inlineSize: `${Math.min((contributionGoal.currentAmount / contributionGoal.targetAmount) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                    Contribution Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-light-text-tertiary dark:text-dark-text-tertiary" />
                    <CurrencyInput
                      name="contributionAmount"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-light-border-default dark:border-dark-border-default bg-light-surface-secondary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-tertiary dark:placeholder-dark-text-tertiary focus:ring-2 focus:ring-success-500 focus:border-transparent transition-all duration-200"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary mt-1">
                    Remaining to goal: {formatCurrency(contributionGoal.targetAmount - contributionGoal.currentAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={cancelContribution}
                className="flex-1 px-4 py-3 rounded-lg border border-light-border-default dark:border-dark-border-default text-light-text-primary dark:text-dark-text-primary bg-light-surface-secondary dark:bg-dark-surface-secondary hover:bg-light-surface-hover dark:hover:bg-dark-surface-hover font-semibold transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmContribution}
                disabled={!contributionAmount || isNaN(contributionAmount) || parseFloat(contributionAmount) <= 0}
                className="flex-1 px-4 py-3 rounded-lg bg-success-500 hover:bg-success-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:hover:shadow-md flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Add Contribution
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
};

export default Goals;
