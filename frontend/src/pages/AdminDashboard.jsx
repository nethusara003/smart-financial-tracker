import { useState } from "react";
import SystemPageHeader from "../components/layout/SystemPageHeader";

import { InlineEditor, useToast } from "../components/ui";
import {
  useAdminAnalyticsOverview,
  useAdminAuditLogs,
  useAdminUserTransactions,
  useAdminUsers,
  useDemoteUser,
  usePromoteUser,
} from "../hooks/useAdminDashboard";
import {
  Users,
  TrendingUp,
  Activity,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  UserPlus,
  UserMinus,
  BarChart3,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Clock,
  FileText,
  ChevronDown,
  X,
  RefreshCw
} from "lucide-react";
import { getAuth } from "../utils/auth";

/* =========================
   HELPER COMPONENTS
========================= */

const StatCard = ({ icon, label, value, iconColor, bgColor }) => {
  const Icon = icon;
  return (
  <div className="bg-light-surface-secondary dark:bg-dark-surface-primary rounded-xl border border-light-border-default dark:border-dark-border-strong p-4 shadow-card dark:shadow-card-dark hover:shadow-elevated dark:hover:shadow-elevated-dark transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary mb-1">{label}</p>
        <p className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">{value}</p>
      </div>
      <div className={`${bgColor} p-2 rounded-lg`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
    </div>
  </div>
  );
};

const AnalyticsCard = ({ icon, label, value, trend, trendUp }) => {
  const Icon = icon;
  return (
  <div className="bg-light-surface-secondary dark:bg-dark-surface-primary rounded-xl border border-light-border-default dark:border-dark-border-strong p-4 shadow-card dark:shadow-card-dark">
    <div className="flex items-center gap-2 mb-2">
      <div className="bg-light-surface-primary dark:bg-dark-surface-elevated p-1.5 rounded-lg">
        <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      <p className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary">{label}</p>
    </div>
    <div className="flex items-end justify-between">
      <p className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">{value}</p>
      <div className={`flex items-center gap-1 text-xs font-medium ${
        trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}>
        {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {trend}
      </div>
    </div>
  </div>
  );
};

const SummaryCard = ({ icon, label, value, color, bgColor }) => {
  const Icon = icon;
  return (
  <div className={`${bgColor} rounded-xl border border-light-border-subtle dark:border-dark-border-subtle p-4`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <p className="text-xs uppercase tracking-wide text-light-text-tertiary dark:text-dark-text-tertiary font-semibold">
        {label}
      </p>
    </div>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
  );
};

const RoleBadge = ({ role }) => {
  const styles = {
    super_admin: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    admin: "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    user: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  };

  const labels = {
    super_admin: "Super Admin",
    admin: "Admin",
    user: "User",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[role] || styles.user}`}>
      {labels[role] || role}
    </span>
  );
};

/* =========================
   MAIN COMPONENT
========================= */

const AdminDashboard = () => {
  const toast = useToast();

  const [selectedUser, setSelectedUser] = useState(null);
  
  // New state for enhanced features
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy] = useState("createdAt");
  const [sortOrder] = useState("desc");
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [pendingRoleAction, setPendingRoleAction] = useState(null);
  const [promotionReason, setPromotionReason] = useState("");
  const promoteUserMutation = usePromoteUser();
  const demoteUserMutation = useDemoteUser();

  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
    isFetching: usersFetching,
  } = useAdminUsers({ refetchInterval: 4000 });

  const {
    data: adminAnalytics = null,
    refetch: refetchAdminAnalytics,
    isFetching: adminAnalyticsFetching,
  } = useAdminAnalyticsOverview({ refetchInterval: 4000 });

  const { data: auditLogs = [] } = useAdminAuditLogs({ enabled: showAuditLogs, refetchInterval: showAuditLogs ? 4000 : false });

  const { data: transactions = [], isLoading: txLoading, refetch: refetchUserTransactions, isFetching: txFetching } = useAdminUserTransactions(
    selectedUser?._id,
    {
      enabled: Boolean(selectedUser),
      refetchInterval: 4000, // Poll every 4 seconds ONLY when the modal is open
    }
  );

  const roleActionLoading = promoteUserMutation.isPending || demoteUserMutation.isPending;
  const loading = usersLoading;
  const isRefreshing = usersFetching || adminAnalyticsFetching;
  const error = usersError?.message || "";
  const currentUser = getAuth()?.user || null;



  /* =========================
     ROLE ACTIONS
  ========================= */
  const promoteUser = (id, name) => {
    setPendingRoleAction({ type: "promote", userId: id, userName: name });
  };

  const demoteUser = (id, name) => {
    setPendingRoleAction({ type: "demote", userId: id, userName: name });
  };

  const confirmRoleAction = async () => {
    if (!pendingRoleAction) return;

    try {
      if (pendingRoleAction.type === "promote") {
        await promoteUserMutation.mutateAsync({
          userId: pendingRoleAction.userId,
          reason: promotionReason,
        });
      } else {
        await demoteUserMutation.mutateAsync(pendingRoleAction.userId);
      }

      toast.success(
        pendingRoleAction.type === "promote"
          ? "Promotion request submitted for super admin approval"
          : "Admin demoted to user"
      );

      setPendingRoleAction(null);
      setPromotionReason("");
    } catch (e) {
      toast.error(e.message || "Failed to update user role");
    }
  };

  /* =========================
     FETCH USER TRANSACTIONS
  ========================= */
  const handleViewUserTransactions = (user) => {
    setSelectedUser(user);
  };

  /* =========================
     STATS
  ========================= */
  const totalUsers = users.length;
  const admins = users.filter((u) => u.role === "admin").length;
  const regularUsers = users.filter((u) => u.role === "user").length;
  const superAdmins = users.filter((u) => u.role === "super_admin").length;

  /* =========================
     SEARCH & FILTER
  ========================= */
  const filteredUsers = users
    .filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (sortBy === "createdAt") {
        return sortOrder === "desc"
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortBy === "name") {
        return sortOrder === "desc"
          ? (b.name || "").localeCompare(a.name || "")
          : (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });

  /* =========================
     PER-USER SUMMARY
  ========================= */
  const summary = transactions.reduce(
    (acc, tx) => {
      const amount = Number(tx.amount) || 0;

      if (tx.type === "income") acc.income += amount;
      if (tx.type === "expense") acc.expense += amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const netBalance = summary.income - summary.expense;

  /* =========================
     SAFE DESTRUCTURING
  ========================= */
  const systemUsers = adminAnalytics?.users;
  const systemTx = adminAnalytics?.transactions;

  /* =========================
     EXPORT FUNCTIONALITY
  ========================= */
  const exportToCSV = () => {
    const headers = ["Name", "Account Number", "Email", "Role", "Created"];
    const rows = filteredUsers.map((u) => [
      u.name,
      u.accountNumber || "",
      u.email,
      u.role,
      new Date(u.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  /* =========================
     REFRESH DATA
  ========================= */
  const refreshData = () => {
    refetchUsers();
    refetchAdminAnalytics();
  };

  return (
    <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <SystemPageHeader
          tagline="ADMINISTRATION"
          title="Admin Dashboard"
          subtitle="System overview & user management"
          className="!py-5"
          actions={
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-white text-sm font-semibold hover:bg-white/[0.08] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            label="Total Users"
            value={totalUsers}
            iconColor="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            icon={Shield}
            label="Admins"
            value={admins}
            iconColor="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-50 dark:bg-purple-900/20"
          />
          <StatCard
            icon={Users}
            label="Regular Users"
            value={regularUsers}
            iconColor="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <StatCard
            icon={Activity}
            label="Super Admins"
            value={superAdmins}
            iconColor="text-amber-600 dark:text-amber-400"
            bgColor="bg-amber-50 dark:bg-amber-900/20"
          />
        </div>

        {/* System Analytics */}
        {systemUsers && systemTx && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnalyticsCard
              icon={BarChart3}
              label="Total Transactions"
              value={systemTx.total.toLocaleString()}
              trend="+12%"
              trendUp={true}
            />
            <AnalyticsCard
              icon={DollarSign}
              label="System Volume"
              value={`Rs. ${systemTx.totalVolume.toLocaleString()}`}
              trend="+8%"
              trendUp={true}
            />
            <AnalyticsCard
              icon={TrendingUp}
              label="Active Users (30d)"
              value={systemUsers.activeLast30Days}
              trend="+5%"
              trendUp={true}
            />
            <AnalyticsCard
              icon={AlertCircle}
              label="High-Risk Users"
              value={systemUsers.highRisk}
              trend="-3%"
              trendUp={false}
            />
          </div>
        )}

        {/* Users Management Section */}
        <div className="bg-light-surface-secondary dark:bg-dark-surface-primary rounded-2xl border border-light-border-default dark:border-dark-border-strong p-6 shadow-premium dark:shadow-card-dark">
          
          {/* Search & Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </h2>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 lg:flex-none lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-tertiary dark:text-dark-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-light-surface-primary dark:bg-dark-surface-elevated border border-light-border-default dark:border-dark-border-strong rounded-lg text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-tertiary hover:text-light-text-primary dark:text-dark-text-tertiary dark:hover:text-dark-text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 bg-light-surface-primary dark:bg-dark-surface-elevated border border-light-border-default dark:border-dark-border-strong rounded-lg text-light-text-primary dark:text-dark-text-primary hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-secondary transition-colors flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filter
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showFilters && (
                    <div className="absolute right-0 mt-2 w-48 bg-light-surface-primary dark:bg-dark-surface-elevated border border-light-border-default dark:border-dark-border-strong rounded-lg shadow-elevated dark:shadow-elevated-dark z-10">
                      <div className="p-3 space-y-2">
                        <p className="text-xs font-semibold text-light-text-tertiary dark:text-dark-text-tertiary uppercase">Role</p>
                        {["all", "super_admin", "admin", "user"].map((role) => (
                          <button
                            key={role}
                            onClick={() => {
                              setRoleFilter(role);
                              setShowFilters(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              roleFilter === role
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                : "text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-secondary"
                            }`}
                          >
                            {role === "all" ? "All Users" : role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Export */}
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || roleFilter !== "all") && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-light-text-tertiary dark:text-dark-text-tertiary">Active filters:</span>
                {searchTerm && (
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium flex items-center gap-1">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm("")} className="hover:text-blue-800 dark:hover:text-blue-200">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {roleFilter !== "all" && (
                  <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium flex items-center gap-1">
                    Role: {roleFilter.replace("_", " ")}
                    <button onClick={() => setRoleFilter("all")} className="hover:text-purple-800 dark:hover:text-purple-200">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Users Table */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 dark:border-blue-400 border-t-transparent"></div>
              <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">Loading users...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-light-border-default dark:border-dark-border-strong">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-tertiary dark:text-dark-text-tertiary">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-tertiary dark:text-dark-text-tertiary">Account No.</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-tertiary dark:text-dark-text-tertiary">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-tertiary dark:text-dark-text-tertiary">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-tertiary dark:text-dark-text-tertiary">Created</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-light-text-tertiary dark:text-dark-text-tertiary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-light-text-tertiary dark:text-dark-text-tertiary">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u._id}
                        className="border-b border-light-border-subtle dark:border-dark-border-subtle last:border-0 hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-secondary transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {u.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <span className="font-medium text-light-text-primary dark:text-dark-text-primary">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-light-text-secondary dark:text-dark-text-secondary">
                          {u.accountNumber || "—"}
                        </td>
                        <td className="py-3 px-4 text-light-text-secondary dark:text-dark-text-secondary">{u.email}</td>
                        <td className="py-3 px-4">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="py-3 px-4 text-light-text-secondary dark:text-dark-text-secondary text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {u._id === currentUser?.id ? (
                              <span className="text-sm text-light-text-tertiary dark:text-dark-text-tertiary italic">You</span>
                            ) : (
                              <>
                                {u.role === "user" && (
                                  <button
                                    onClick={() => promoteUser(u._id, u.name)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-1 transition-colors"
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Promote
                                  </button>
                                )}
                                {u.role === "admin" && currentUser?.role === "super_admin" && (
                                  <button
                                    onClick={() => demoteUser(u._id, u.name)}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm flex items-center gap-1 transition-colors"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                    Demote
                                  </button>
                                )}
                                <button
                                  onClick={() => handleViewUserTransactions(u)}
                                  className="px-3 py-1.5 bg-light-surface-primary dark:bg-dark-surface-elevated border border-light-border-default dark:border-dark-border-strong hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-md text-sm flex items-center gap-1 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Results Count */}
          {!loading && !error && (
            <div className="mt-4 pt-4 border-t border-light-border-subtle dark:border-dark-border-subtle text-sm text-light-text-tertiary dark:text-dark-text-tertiary text-center">
              Showing {filteredUsers.length} of {totalUsers} users
            </div>
          )}
        </div>

        {/* Recent Activity / Audit Logs */}
        <div className="bg-light-surface-secondary dark:bg-dark-surface-primary rounded-2xl border border-light-border-default dark:border-dark-border-strong p-6 shadow-premium dark:shadow-card-dark">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </h2>
            <button
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className="px-4 py-2 bg-light-surface-primary dark:bg-dark-surface-elevated border border-light-border-default dark:border-dark-border-strong rounded-lg text-light-text-primary dark:text-dark-text-primary hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-secondary transition-colors flex items-center gap-2"
            >
              {showAuditLogs ? "Hide" : "Show"} Logs
              <ChevronDown className={`w-4 h-4 transition-transform ${showAuditLogs ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showAuditLogs && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-light-text-tertiary dark:text-dark-text-tertiary">
                  No recent activity
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log._id}
                    className="p-4 bg-light-surface-primary dark:bg-dark-surface-elevated rounded-lg border border-light-border-subtle dark:border-dark-border-subtle hover:border-light-border-default dark:hover:border-dark-border-strong transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          log.action === "PROMOTE" 
                            ? "bg-emerald-100 dark:bg-emerald-900/20" 
                            : "bg-red-100 dark:bg-red-900/20"
                        }`}>
                          {log.action === "PROMOTE" ? (
                            <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <UserMinus className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                            <span className="font-semibold">{log.performedBy?.name || "Admin"}</span>
                            {" "}
                            {log.action === "PROMOTE" ? "promoted" : "demoted"}
                            {" "}
                            <span className="font-semibold">{log.targetUser?.name || "User"}</span>
                          </p>
                          <p className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary mt-1">
                            {log.targetUser?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-light-text-tertiary dark:text-dark-text-tertiary">
                        <Clock className="w-3 h-3" />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User Transactions Modal */}
        {selectedUser && (
          <div className="bg-light-surface-secondary dark:bg-dark-surface-primary rounded-2xl border border-light-border-default dark:border-dark-border-strong p-6 shadow-premium dark:shadow-card-dark">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Transactions - {selectedUser.name}
                <button
                  onClick={() => refetchUserTransactions()}
                  disabled={txFetching}
                  className="p-1.5 hover:bg-light-surface-primary dark:hover:bg-dark-surface-elevated rounded-lg transition-colors text-light-text-tertiary dark:text-dark-text-tertiary disabled:opacity-50"
                  title="Manual refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${txFetching ? 'animate-spin' : ''}`} />
                </button>
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-light-text-tertiary dark:text-dark-text-tertiary" />
              </button>
            </div>

            {txLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 dark:border-blue-400 border-t-transparent"></div>
                <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">Loading transactions...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <SummaryCard
                    icon={TrendingUp}
                    label="Income"
                    value={`Rs. ${summary.income.toLocaleString()}`}
                    color="text-emerald-600 dark:text-emerald-400"
                    bgColor="bg-emerald-50 dark:bg-emerald-900/20"
                  />
                  <SummaryCard
                    icon={TrendingUp}
                    label="Expense"
                    value={`Rs. ${summary.expense.toLocaleString()}`}
                    color="text-red-600 dark:text-red-400"
                    bgColor="bg-red-50 dark:bg-red-900/20"
                  />
                  <SummaryCard
                    icon={DollarSign}
                    label="Net Balance"
                    value={`Rs. ${netBalance.toLocaleString()}`}
                    color={netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
                    bgColor={netBalance >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}
                  />
                  <SummaryCard
                    icon={BarChart3}
                    label="Transactions"
                    value={transactions.length}
                    color="text-blue-600 dark:text-blue-400"
                    bgColor="bg-blue-50 dark:bg-blue-900/20"
                  />
                </div>

                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-light-text-tertiary dark:text-dark-text-tertiary">
                    No transactions found for this user
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transactions.slice(0, 20).map((tx) => (
                      <div
                        key={tx._id}
                        className="p-4 bg-light-surface-primary dark:bg-dark-surface-elevated rounded-lg border border-light-border-subtle dark:border-dark-border-subtle hover:border-light-border-default dark:hover:border-dark-border-strong transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              tx.type === "income" ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-red-100 dark:bg-red-900/20"
                            }`}>
                              {tx.type === "income" ? (
                                <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-light-text-primary dark:text-dark-text-primary">{tx.category}</p>
                              <p className="text-sm text-light-text-tertiary dark:text-dark-text-tertiary">
                                {new Date(tx.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                            }`}>
                              {tx.type === "income" ? "+" : "-"}Rs. {tx.amount.toLocaleString()}
                            </p>
                            {tx.description && (
                              <p className="text-sm text-light-text-tertiary dark:text-dark-text-tertiary truncate max-w-xs">
                                {tx.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <InlineEditor
          isOpen={Boolean(pendingRoleAction)}
          title={pendingRoleAction?.type === "promote" ? "Request Promotion" : "Demote Admin"}
          subtitle="Confirm role change"
          onClose={() => {
            if (roleActionLoading) return;
            setPendingRoleAction(null);
          }}
          className="max-w-xl"
        >
          {pendingRoleAction && (
            <div className="space-y-4">
              <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                {pendingRoleAction.type === "promote"
                  ? `Request promotion of ${pendingRoleAction.userName || "this user"} to admin? This will be sent to the super admin for approval.`
                  : `Demote ${pendingRoleAction.userName || "this admin"} to regular user?`}
              </p>
              {pendingRoleAction.type === "promote" && (
                <div>
                  <label className="block text-xs font-medium text-light-text-tertiary dark:text-dark-text-tertiary mb-1.5">
                    Reason (optional)
                  </label>
                  <textarea
                    value={promotionReason}
                    onChange={(e) => setPromotionReason(e.target.value)}
                    placeholder="Why should this user be promoted?"
                    rows={3}
                    className="w-full px-3 py-2 bg-light-surface-primary dark:bg-dark-surface-elevated border border-light-border-default dark:border-dark-border-strong rounded-lg text-sm text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingRoleAction(null)}
                  disabled={roleActionLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-light-border-default dark:border-dark-border-strong text-light-text-primary dark:text-dark-text-primary bg-light-surface-primary dark:bg-dark-surface-secondary font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRoleAction}
                  disabled={roleActionLoading}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white font-semibold disabled:opacity-60 ${
                    pendingRoleAction.type === "promote"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600"
                      : "bg-gradient-to-r from-red-500 to-red-600"
                  }`}
                >
                  {roleActionLoading
                    ? "Applying..."
                    : pendingRoleAction.type === "promote"
                    ? "Submit Request"
                    : "Demote"}
                </button>
              </div>
            </div>
          )}
        </InlineEditor>

    </div>
  );
};

export default AdminDashboard;
