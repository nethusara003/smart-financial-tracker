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
    bg: 'bg-[rgba(59,130,246,0.12)]',
    icon: 'text-[#3B82F6]',
    border: 'border-[rgba(59,130,246,0.2)]'
  },
  success: {
    bg: 'bg-[rgba(16,185,129,0.12)]',
    icon: 'text-[#10B981]',
    border: 'border-[rgba(16,185,129,0.2)]'
  },
  warning: {
    bg: 'bg-[rgba(245,158,11,0.12)]',
    icon: 'text-[#F59E0B]',
    border: 'border-[rgba(245,158,11,0.2)]'
  },
  danger: {
    bg: 'bg-[rgba(248,113,113,0.12)]',
    icon: 'text-[#F87171]',
    border: 'border-[rgba(248,113,113,0.2)]'
  },
  info: {
    bg: 'bg-white/5',
    icon: 'text-[#9CA3AF]',
    border: 'border-white/5'
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
      panelClassName="w-[380px] max-w-[380px] h-screen"
      backdropClassName="bg-black/40 backdrop-blur-sm"
      ariaLabelledBy="notification-center-title"
    >
      <div className="w-full h-full bg-[#0D1117] shadow-2xl transform transition-transform duration-300 ease-out overflow-hidden flex flex-col border-l border-white/5">
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-[#111722]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                <Bell className="w-5 h-5 text-[#F9FAFB]" />
              </div>
              <div>
                <h2 id="notification-center-title" className="text-lg font-bold text-[#F9FAFB]">Notifications</h2>
                <p className="text-xs text-[#9CA3AF]">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#9CA3AF] hover:bg-white/5 hover:text-[#F9FAFB] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all border ${
                filter === 'all'
                  ? 'bg-[rgba(59,130,246,0.12)] text-[#3B82F6] border-[rgba(59,130,246,0.2)]'
                  : 'bg-transparent text-[#9CA3AF] border-transparent hover:bg-white/5'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all border ${
                filter === 'unread'
                  ? 'bg-[rgba(59,130,246,0.12)] text-[#3B82F6] border-[rgba(59,130,246,0.2)]'
                  : 'bg-transparent text-[#9CA3AF] border-transparent hover:bg-white/5'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>

        {/* Actions Bar */}
        {notifications.length > 0 && (
          <div className="px-5 py-2.5 border-b border-white/5 bg-[#05070A] flex gap-2">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5 rounded-md transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[rgba(59,130,246,0.2)] border-t-[#3B82F6]"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <div className="p-4 bg-[rgba(59,130,246,0.12)] rounded-full mb-4 border border-[rgba(59,130,246,0.2)]">
                <Bell className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <h3 className="text-sm font-semibold text-[#F9FAFB] mb-1">
                No notifications
              </h3>
              <p className="text-xs text-[#9CA3AF]">
                {filter === 'unread' ? "You're all caught up!" : "You'll see notifications here when you have them"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => {
                const Icon = iconMap[notification.icon] || Bell;
                const colors = colorClasses[notification.color] || colorClasses.info;

                return (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-white/5 transition-colors group relative ${
                      !notification.read ? 'bg-[rgba(59,130,246,0.03)]' : ''
                    }`}
                  >
                    {!notification.read && (
                      <span className="absolute left-0 top-[20%] h-[60%] w-[3px] bg-[rgba(59,130,246,0.70)] rounded-r-sm" />
                    )}
                    <div className="flex gap-3 pl-1">
                      <div className={`p-2 ${colors.bg} rounded-lg h-fit border ${colors.border} shrink-0`}>
                        <Icon className={`w-4 h-4 ${colors.icon}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-[#F9FAFB] text-xs">
                            {notification.title}
                          </h4>
                        </div>

                        <p className="text-xs text-[#9CA3AF] mb-2 leading-relaxed">
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
                          <span className="text-[10px] font-medium tracking-wide text-[#475569] uppercase">
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
                                className="text-[11px] font-medium text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
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
