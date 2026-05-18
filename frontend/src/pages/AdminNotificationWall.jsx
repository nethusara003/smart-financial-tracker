import { useState } from "react";
import {
  Shield,
  Bell,
  CheckCircle,
  XCircle,
  UserPlus,
  Clock,
  User,
  ChevronDown,
} from "lucide-react";
import { useToast } from "../components/ui";
import {
  useAdminWallNotifications,
  useReviewPromotion,
  useMarkAdminWallRead,
} from "../hooks/useAdminWall";
import { getAuth } from "../utils/auth";

/* =========================
   EVENT TYPE CONFIG
========================= */
const eventConfig = {
  promotion_requested: {
    icon: UserPlus,
    color: "text-blue-400",
    bg: "bg-blue-900/20",
    border: "border-blue-800",
    label: "Request",
  },
  promotion_approved: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-900/20",
    border: "border-emerald-800",
    label: "Approved",
  },
  promotion_rejected: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-900/20",
    border: "border-red-800",
    label: "Rejected",
  },
  promotion_accepted_by_user: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-900/20",
    border: "border-emerald-800",
    label: "Accepted",
  },
  promotion_declined_by_user: {
    icon: XCircle,
    color: "text-amber-400",
    bg: "bg-amber-900/20",
    border: "border-amber-800",
    label: "Declined",
  },
};

const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

/* =========================
   FILTER TABS
========================= */
const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "resolved", label: "Resolved" },
];

const PENDING_EVENTS = ["promotion_requested"];
const RESOLVED_EVENTS = [
  "promotion_approved",
  "promotion_rejected",
  "promotion_accepted_by_user",
  "promotion_declined_by_user",
];

/* =========================
   MAIN COMPONENT
========================= */
const AdminNotificationWall = () => {
  const toast = useToast();
  const [filter, setFilter] = useState("all");

  const currentUser = getAuth()?.user || null;
  const isSuperAdmin = currentUser?.role === "super_admin";

  const {
    data = { notifications: [], unreadCount: 0 },
    isLoading,
  } = useAdminWallNotifications({
    refetchInterval: 10000,
  });

  const reviewMutation = useReviewPromotion();
  const markReadMutation = useMarkAdminWallRead();

  const notifications = data.notifications || [];
  const unreadCount = data.unreadCount || 0;

  /* Filter logic */
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "pending") return PENDING_EVENTS.includes(n.eventType);
    if (filter === "resolved") return RESOLVED_EVENTS.includes(n.eventType);
    return true;
  });

  /* Handlers */
  const handleReview = async (requestId, decision) => {
    try {
      await reviewMutation.mutateAsync({ requestId, decision });
      toast.success(
        decision === "approve"
          ? "Promotion approved — user has been notified"
          : "Promotion request rejected"
      );
    } catch (e) {
      toast.error(e.message || "Failed to process review");
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markReadMutation.mutateAsync(id);
    } catch {
      // Silent fail for read tracking
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-bg-primary via-light-surface-primary to-light-bg-accent dark:from-dark-bg-primary dark:via-dark-bg-secondary dark:to-dark-bg-tertiary p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 rounded-2xl p-8 shadow-premium dark:shadow-glow-blue border border-white/20">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Notification Wall</h1>
              <p className="text-indigo-100 mt-1">
                Promotion workflow activity — visible to admins & super admins only
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <Bell className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border ${
                filter === key
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  : "bg-light-surface-secondary dark:bg-dark-surface-primary text-light-text-tertiary dark:text-dark-text-tertiary border-light-border-default dark:border-dark-border-strong hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Notifications Feed */}
        <div className="bg-light-surface-secondary dark:bg-dark-surface-primary rounded-2xl border border-light-border-default dark:border-dark-border-strong shadow-premium dark:shadow-card-dark overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4 border border-blue-200 dark:border-blue-800">
                <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-1">
                No notifications
              </h3>
              <p className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary">
                {filter === "pending"
                  ? "No pending promotion requests"
                  : "Promotion workflow activity will appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-light-border-subtle dark:divide-dark-border-subtle">
              {filteredNotifications.map((notification) => {
                const config = eventConfig[notification.eventType] || eventConfig.promotion_requested;
                const Icon = config.icon;
                const isUnread = !notification.read;
                const isPendingRequest =
                  notification.eventType === "promotion_requested" &&
                  notification.promotionRequestId?.status === "pending_super_admin";

                return (
                  <div
                    key={notification._id}
                    className={`p-5 transition-colors relative ${
                      isUnread
                        ? "bg-blue-50/50 dark:bg-[rgba(59,130,246,0.03)]"
                        : "hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-secondary"
                    }`}
                    onClick={() => {
                      if (isUnread) handleMarkRead(notification._id);
                    }}
                  >
                    {/* Unread indicator */}
                    {isUnread && (
                      <span className="absolute left-0 top-[20%] h-[60%] w-[3px] bg-blue-500 dark:bg-[rgba(59,130,246,0.70)] rounded-r-sm" />
                    )}

                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`p-2.5 ${config.bg} rounded-xl h-fit border ${config.border} shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-light-text-primary dark:text-dark-text-primary">
                              {notification.title}
                            </h4>
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full border ${config.bg} ${config.color} ${config.border}`}>
                              {config.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-light-text-tertiary dark:text-dark-text-tertiary whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(notification.createdAt)}
                          </div>
                        </div>

                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-3 leading-relaxed">
                          {notification.message}
                        </p>

                        {/* Actor / Target info */}
                        <div className="flex items-center gap-4 text-xs text-light-text-tertiary dark:text-dark-text-tertiary mb-3">
                          {notification.actor && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              By: {notification.actor.name || notification.actor.email}
                            </span>
                          )}
                          {notification.targetUser && (
                            <span className="flex items-center gap-1">
                              <UserPlus className="w-3 h-3" />
                              For: {notification.targetUser.name || notification.targetUser.email}
                            </span>
                          )}
                        </div>

                        {/* Super Admin Action Buttons */}
                        {isSuperAdmin && isPendingRequest && (
                          <div className="flex items-center gap-3 pt-2 border-t border-light-border-subtle dark:border-dark-border-subtle">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReview(notification.promotionRequestId._id, "approve");
                              }}
                              disabled={reviewMutation.isPending}
                              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReview(notification.promotionRequestId._id, "reject");
                              }}
                              disabled={reviewMutation.isPending}
                              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                            {reviewMutation.isPending && (
                              <span className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary animate-pulse">
                                Processing...
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer note */}
        {!isLoading && filteredNotifications.length > 0 && (
          <p className="text-center text-xs text-light-text-tertiary dark:text-dark-text-tertiary">
            Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
            {filter !== "all" ? ` (${filter})` : ""}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationWall;
