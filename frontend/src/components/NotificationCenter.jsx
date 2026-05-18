import { useState } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  TrendingDown, 
  TrendingUp,
  Calendar,
  DollarSign,
  Target,
  Check,
  Trash2,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContextMenu, Overlay } from './ui';
import {
  useClearReadNotifications,
  useDeleteNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '../hooks/useNotifications';
import { useRespondToPromotion } from '../hooks/usePromotionResponse';

const iconMap = {
  Bell: Bell,
  CheckCircle: CheckCircle,
  AlertCircle: AlertCircle,
  Info: Info,
  TrendingDown: TrendingDown,
  TrendingUp: TrendingUp,
  Calendar: Calendar,
  DollarSign: DollarSign,
  Target: Target,
  BarChart: Calendar,
  Shield: Shield
};

const colorClasses = {
  primary: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/30'
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-500/30'
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-500/30'
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/30'
  },
  info: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-500/30'
  }
};

export default function NotificationCenter({ isOpen, onClose }) {
  const [filter, setFilter] = useState('all'); // all, unread
  const [activeMenuId, setActiveMenuId] = useState(null);

  const {
    data,
    isLoading,
  } = useNotifications({
    unreadOnly: filter === 'unread',
    enabled: isOpen,
    refetchInterval: isOpen ? 30000 : false,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const clearReadMutation = useClearReadNotifications();
  const promotionResponseMutation = useRespondToPromotion();

  const respondToPromotion = async (requestId, decision) => {
    try {
      await promotionResponseMutation.mutateAsync({ requestId, decision });
    } catch (error) {
      console.error('Error responding to promotion:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await markAsReadMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await deleteNotificationMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAll = async () => {
    try {
      await clearReadMutation.mutateAsync();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <Overlay
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="items-start justify-end p-0"
      panelClassName="max-w-md h-screen"
      backdropClassName="bg-black/20 dark:bg-black/40 backdrop-blur-sm"
      ariaLabelledBy="notification-center-title"
    >
      <div className="w-full h-screen bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-out overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 id="notification-center-title" className="text-2xl font-bold text-white">Notifications</h2>
                <p className="text-sm text-blue-100">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>

        {/* Actions Bar */}
        {notifications.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-2">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark all read
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
                <Bell className="w-8 h-8 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filter === 'unread' ? "You're all caught up!" : "You'll see notifications here when you have them"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => {
                const Icon = iconMap[notification.icon] || Bell;
                const colors = colorClasses[notification.color] || colorClasses.info;

                return (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      !notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 ${colors.bg} rounded-lg h-fit`}>
                        <Icon className={`w-5 h-5 ${colors.icon}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {notification.message}
                        </p>

                        {/* Promotion Accept/Decline buttons */}
                        {notification.data?.promotionRequestId && (
                          <div className="flex gap-2 mb-2">
                            <button
                              onClick={() => {
                                respondToPromotion(notification.data.promotionRequestId, 'accept');
                                markAsRead(notification._id);
                              }}
                              disabled={promotionResponseMutation.isPending}
                              className="px-3 py-1 text-xs font-medium rounded-md bg-[rgba(16,185,129,0.12)] text-[#10B981] border border-[rgba(16,185,129,0.2)] hover:bg-[rgba(16,185,129,0.2)] transition-colors disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => {
                                respondToPromotion(notification.data.promotionRequestId, 'reject');
                                markAsRead(notification._id);
                              }}
                              disabled={promotionResponseMutation.isPending}
                              className="px-3 py-1 text-xs font-medium rounded-md bg-[rgba(248,113,113,0.12)] text-[#F87171] border border-[rgba(248,113,113,0.2)] hover:bg-[rgba(248,113,113,0.2)] transition-colors disabled:opacity-50"
                            >
                              Decline
                            </button>
                            {promotionResponseMutation.isPending && (
                              <span className="text-[10px] text-[#9CA3AF] self-center animate-pulse">Processing...</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {getTimeAgo(notification.createdAt)}
                          </span>

                          <div className="flex items-center gap-2">
                            {notification.actionUrl && (
                              <Link
                                to={notification.actionUrl}
                                onClick={() => {
                                  markAsRead(notification._id);
                                  onClose();
                                }}
                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                View
                              </Link>
                            )}
                            <ContextMenu
                              isOpen={activeMenuId === notification._id}
                              onOpenChange={(open) => setActiveMenuId(open ? notification._id : null)}
                              items={[
                                ...(!notification.read
                                  ? [{ key: 'read', label: 'Mark read', onClick: () => markAsRead(notification._id) }]
                                  : []),
                                { key: 'delete', label: 'Delete', onClick: () => deleteNotification(notification._id), variant: 'danger' },
                              ]}
                              menuClassName="w-40"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
