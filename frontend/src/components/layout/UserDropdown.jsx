import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { User, Settings, FileText, HelpCircle, LogOut, Shield, Bell, Key, ChevronRight } from 'lucide-react';
import useClickOutside from '../../hooks/useClickOutside';

const UserDropdown = ({ isOpen, onClose, user, onLogout }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const displayUser = currentUser || user;
  const dropdownRef = useRef(null);

  const closeDropdown = useCallback(() => {
    onClose();
  }, [onClose]);

  useClickOutside(dropdownRef, closeDropdown, isOpen);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDropdown]);

  if (!isOpen) return null;

  const menuSections = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Profile',
          description: 'Manage your personal information',
          action: () => {
            navigate('/settings?tab=profile');
            onClose();
          }
        },
        {
          icon: Settings,
          label: 'Account Settings',
          description: 'Preferences and configuration',
          action: () => {
            navigate('/settings?tab=preferences');
            onClose();
          }
        },
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Manage notifications',
          action: () => {
            navigate('/settings?tab=notifications');
            onClose();
          }
        }
      ]
    },
    {
      title: 'Security',
      items: [
        {
          icon: Shield,
          label: 'Privacy & Security',
          description: 'Control your privacy settings',
          action: () => {
            navigate('/settings?tab=privacy');
            onClose();
          }
        },
        {
          icon: Key,
          label: 'Change Password',
          description: 'Update your password',
          action: () => {
            navigate('/settings?tab=password');
            onClose();
          }
        }
      ]
    },
    {
      title: 'Resources',
      items: [
        {
          icon: FileText,
          label: 'Reports',
          description: 'View your financial reports',
          action: () => {
            navigate('/reports');
            onClose();
          }
        },
        {
          icon: HelpCircle,
          label: 'Help & Support',
          description: 'Get help and support',
          action: () => {
            onClose();
            // Help panel would be opened by parent
          }
        }
      ]
    }
  ];

  return (
    <>
      {/* Dropdown Menu */}
      <div ref={dropdownRef} className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-2xl overflow-hidden z-50 animate-scale-in" style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header — dark gradient matching dashboard header band */}
        <div className="relative p-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F172A, #020617)' }}>
          <div className="relative flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="relative w-11 h-11 rounded-xl p-0.5" style={{ background: 'rgba(59,130,246,0.20)', border: '1px solid rgba(59,130,246,0.30)' }}>
                <div className="w-full h-full rounded-xl flex items-center justify-center overflow-hidden" style={{ background: '#0D1117' }}>
                  {displayUser?.profilePicture ? (
                    <img src={displayUser.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold" style={{ color: '#3B82F6' }}>
                      {displayUser?.name?.charAt(0).toUpperCase() || "G"}
                    </span>
                  )}
                </div>
              </div>
              {/* Status indicator */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 rounded-full shadow-lg" style={{ borderColor: '#0D1117' }}></div>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base truncate" style={{ color: '#F9FAFB' }}>
                {displayUser?.name || "Guest User"}
              </h4>
              <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                {displayUser?.email || "guest@example.com"}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        <div className="max-h-[280px] overflow-y-auto py-1.5">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="px-2 py-1.5">
              <div className="px-2 py-1">
                <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {section.title}
                </h5>
              </div>
              <div className="space-y-0.5">
                {section.items.map((item, itemIndex) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={itemIndex}
                      onClick={item.action}
                      className="w-full px-2.5 py-2 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 transition-all text-left group border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Icon container with better spacing */}
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 group-hover:from-blue-100 group-hover:to-blue-200 dark:group-hover:from-blue-900/40 dark:group-hover:to-blue-800/40 rounded-lg transition-all shadow-sm">
                          <IconComponent className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        </div>
                        
                        {/* Text content */}
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="font-semibold text-xs text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                            {item.description}
                          </div>
                        </div>

                        {/* Arrow indicator */}
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Divider */}
              {sectionIndex < menuSections.length - 1 && (
                <div className="my-2 mx-2 border-t border-gray-200 dark:border-gray-700"></div>
              )}
            </div>
          ))}
        </div>

        {/* Danger Sign-Out Button — danger semantic token spec */}
        <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0D1117' }}>
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full px-3 py-2.5 rounded-lg transition-all text-left group"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.20)'
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <LogOut className="w-4 h-4" style={{ color: '#F87171' }} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-xs" style={{ color: '#F87171' }}>
                  Sign Out
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'rgba(248,113,113,0.70)' }}>
                  Log out of your account
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default UserDropdown;
