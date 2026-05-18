import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useUnreadNotificationCount } from "../../hooks/useNotifications";
import CurrencySelector from "../CurrencySelector";
import NotificationCenter from "../NotificationCenter";
import HelpPanel from "./HelpPanel";
import UserDropdown from "./UserDropdown";
import LogoutModal from "../ui/LogoutModal";
import { clearAuthStorage } from "../../utils/authStorage";
import {
  Menu,
  Bell,
  LogOut,
  ChevronDown,
  HelpCircle,
  Moon,
  WalletCards
} from "lucide-react";

// ── Obsidian Shell constants (Permanent Hardlock) ──────────────────────────
const OBSIDIAN      = "#0B0E14";
const ELECTRIC_BLUE = "#3B82F6";

const Topbar = ({ auth }) => {
  const navigate = useNavigate();
  const { isDark, setTheme } = useTheme();
  const { user: currentUser } = useUser();
  const user = auth?.user || currentUser;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp,          setShowHelp]          = useState(false);
  const [showUserDropdown,  setShowUserDropdown]  = useState(false);
  const [showLogoutModal,   setShowLogoutModal]   = useState(false);

  const { data: unreadCount = 0 } = useUnreadNotificationCount({ refetchInterval: 30000 });

  useEffect(() => {
    const handleKeyboard = (e) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          setShowHelp(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  const handleLogout  = () => { setShowLogoutModal(true); setShowUserDropdown(false); };
  const confirmLogout = () => {
    setShowLogoutModal(false);
    clearAuthStorage();
    navigate("/login", { replace: true });
    window.location.reload();
  };
  const cancelLogout  = () => setShowLogoutModal(false);
  const toggleDark    = () => setTheme(isDark ? "light" : "dark");

  /* ── topbar styles (Permanent Obsidian Hardlock) ── */
  const headerStyle = { 
    background: OBSIDIAN,
    borderTop: `2px solid ${ELECTRIC_BLUE}`
  };

  // Force pure white for all shell text and icons
  const iconBtn = `relative rounded-lg p-2 font-sans text-white
    transition-colors duration-200 ease-out
    hover:bg-white/10`;

  const walletWrapper = `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
    border border-white/10 bg-white/5 text-white shadow-sm`;

  const vertDivider = `h-7 w-px bg-white/10`;

  const currencyWrapper = `rounded-lg border border-white/10 bg-white/5 px-1 text-white`;

  const userBtn = `group flex items-center gap-2 rounded-lg px-2 py-1.5 font-sans
    transition-colors duration-200 ease-out hover:bg-white/10`;

  const avatarRing = `h-8 w-8 overflow-hidden rounded-full border border-white/20 bg-white/10`;

  const smallIcon = "h-[18px] w-[18px] stroke-[1.5] stroke-current"; // Reverted to original thin stroke

  return (
    <header
      className="relative z-50 w-full h-[80px] shrink-0
        border-b border-white/5 text-white shadow-xl obsidian-shell"
      style={headerStyle}
    >
      <div className="px-3 py-3 md:px-4 md:py-4 lg:px-5 h-full flex items-center">
        <div className="flex items-center justify-between w-full">

          {/* Left — greeting (Pure White Force) */}
          <div className="flex min-w-0 items-center gap-3">

            <div className={walletWrapper}>
              <WalletCards className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold font-sans text-[#FFFFFF] sm:text-base uppercase tracking-tight">
                <span className="hidden sm:inline">Welcome back, </span>
                {user?.name?.split(" ")[0] || "Guest"}
              </h2>
              <p className="text-[10px] font-bold font-sans text-[#FFFFFF] tracking-[0.1em] uppercase">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric"
                })}
              </p>
            </div>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(true)}
              className={iconBtn}
              title="Notifications"
            >
              <Bell className={smallIcon} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center
                  rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {/* Help */}
            <button
              onClick={() => setShowHelp(true)}
              className={`${iconBtn} hidden sm:flex`}
              title="Help & Support"
            >
              <HelpCircle className={smallIcon} />
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleDark}
              className={`${iconBtn} bg-white/5 hidden sm:flex`}
              title="Switch Theme"
            >
              <Moon className={smallIcon} />
            </button>

            {/* Currency selector */}
            <div className={currencyWrapper}>
              <CurrencySelector variant="compact" showLabel={false} />
            </div>

            {/* Divider */}
            <div className={vertDivider} />

            {/* User dropdown trigger */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(prev => !prev)}
                className={userBtn}
              >
                {user && (
                  <div className="hidden text-right md:block">
                    <p className="max-w-[150px] truncate text-sm font-bold font-sans text-white">
                      {user.name}
                    </p>
                  </div>
                )}
                <div className={avatarRing}>
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold font-sans text-white">
                      {user?.name?.charAt(0).toUpperCase() || "G"}
                    </div>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-white stroke-[2.5]" />
              </button>

              {showUserDropdown && (
                <UserDropdown
                  isOpen={showUserDropdown}
                  onClose={() => setShowUserDropdown(false)}
                  user={user}
                  onLogout={handleLogout}
                />
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`${iconBtn} hidden sm:flex text-red-400 hover:text-red-300 hover:bg-red-500/10`}
              title="Logout"
            >
              <LogOut className={smallIcon} />
            </button>          </div>
        </div>
      </div>

      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <HelpPanel         isOpen={showHelp}           onClose={() => setShowHelp(false)} />
      <LogoutModal       isOpen={showLogoutModal}    onClose={cancelLogout} onConfirm={confirmLogout} />
    </header>
  );
};

export default Topbar;
