import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  TrendingUp,
  BarChart2,
  Wallet,
  Target,
  CalendarClock,
  CreditCard,
  ArrowLeftRight,
  Heart,
  LineChart,
  Sparkles,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Bell
} from "lucide-react";
import { useAdminWallNotifications } from "../../hooks/useAdminWall";

const SidebarHeader = ({ collapsed, onToggle }) => (
  <div className="relative flex items-center gap-2.5 px-3 py-4 border-b border-white/5 min-h-[69px]">
    {/* Logo — always visible, never shrinks */}
    <div className="w-9 h-9 min-w-[36px] rounded-lg bg-[#3B82F6] flex items-center justify-center shrink-0">
      <span className="text-white text-xs font-bold tracking-wide">SFT</span>
    </div>

    {/* Brand — fades out when collapsed */}
    <div className={`overflow-hidden transition-all duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-full'}`}>
      <p className="text-[11px] font-bold text-[#F9FAFB] uppercase tracking-[0.06em] whitespace-nowrap">
        Smart Financial Tracker
      </p>
      <p className="text-[10px] text-[#3B82F6] uppercase tracking-[0.08em]">
        SFT Platform
      </p>
    </div>

    {/* Toggle button */}
    <button
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className={`
        ${collapsed ? 'absolute -right-3.5 top-1/2 -translate-y-1/2 bg-[#0B0E14] shadow-md z-50' : 'ml-auto'}
        w-7 h-7 min-w-[28px] rounded-md
        border border-white/10
        flex items-center justify-center shrink-0
        text-[#9CA3AF]
        hover:bg-[rgba(59,130,246,0.16)] hover:text-[#3B82F6]
        transition-all duration-200
      `}
    >
      {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
    </button>
  </div>
);

const SidebarSection = ({ label, collapsed, children }) => (
  <div className="py-1">
    {/* Section label — collapses away */}
    <p className={`
      px-4 text-[9px] font-semibold text-[#475569] uppercase tracking-[0.12em]
      transition-all duration-150 overflow-hidden whitespace-nowrap
      ${collapsed ? 'opacity-0 max-h-0 py-0' : 'opacity-100 max-h-8 pt-2 pb-1'}
    `}>
      {label}
    </p>
    {children}
  </div>
);

const SidebarItem = ({ icon: Icon, label, to, collapsed }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      group relative flex items-center gap-2.5
      mx-2 px-3 py-2 rounded-lg
      transition-colors duration-150 cursor-pointer
      ${isActive
        ? 'bg-[rgba(59,130,246,0.12)] text-[#F9FAFB]'
        : 'text-[#9CA3AF] hover:bg-[rgba(59,130,246,0.08)] hover:text-[#9CA3AF]'
      }
    `}
  >
    {({ isActive }) => (
      <>
        {/* Active left-edge indicator */}
        {isActive && (
          <span className="
            absolute -left-2 top-[20%] h-[60%] w-[3px]
            bg-[rgba(59,130,246,0.70)] rounded-r-sm
          " />
        )}

        {/* Icon */}
        <Icon
          size={16}
          className={`shrink-0 transition-colors duration-150 ${
            isActive ? 'text-[#3B82F6]' : 'text-[#475569] group-hover:text-[#9CA3AF]'
          }`}
        />

        {/* Label — fades when collapsed */}
        <span className={`
          text-[13px] whitespace-nowrap overflow-hidden
          transition-all duration-[180ms]
          ${isActive ? 'font-medium' : 'font-normal'}
          ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[200px]'}
        `}>
          {label}
        </span>

        {/* Tooltip — only shown when collapsed + hovering */}
        {collapsed && (
          <span className="
            pointer-events-none select-none
            absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2
            bg-[#111722] text-[#F9FAFB]
            text-xs px-2.5 py-1.5 rounded-md
            border border-white/10
            whitespace-nowrap z-[999]
            opacity-0 group-hover:opacity-100
            transition-opacity duration-100
          ">
            {label}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const Sidebar = ({ collapsed, onToggle, auth }) => {
  const userRole = auth?.user?.role;
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  return (
    <aside
      className={`
        flex flex-col h-screen shrink-0
        bg-[#0B0E14]
        border-r border-white/5
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        overflow-visible relative z-[60]
        ${collapsed ? 'w-16' : 'w-[260px]'}
      `}
    >
      <SidebarHeader collapsed={collapsed} onToggle={onToggle} />
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto overflow-x-visible py-2 scrollbar-none">
        <SidebarSection label="Financial" collapsed={collapsed}>
          <SidebarItem icon={LayoutDashboard} label="Dashboard"  to="/dashboard"        collapsed={collapsed} />
          <SidebarItem icon={FileText}        label="Transactions" to="/transactions"    collapsed={collapsed} />
          <SidebarItem icon={TrendingUp}      label="Analytics"   to="/analytics"       collapsed={collapsed} />
          <SidebarItem icon={BarChart2}       label="Reports"     to="/reports"         collapsed={collapsed} />
        </SidebarSection>

        <div className="mx-4 my-1 border-t border-white/5" />

        <SidebarSection label="Tools" collapsed={collapsed}>
          <SidebarItem icon={Wallet}          label="Budgets"          to="/budgets"        collapsed={collapsed} />
          <SidebarItem icon={Target}          label="Goals"            to="/goals"          collapsed={collapsed} />
          <SidebarItem icon={CalendarClock}   label="Bills & Reminders" to="/bills"         collapsed={collapsed} />
          <SidebarItem icon={CreditCard}      label="Loans"            to="/loans"          collapsed={collapsed} />
          <SidebarItem icon={ArrowLeftRight}  label="Transfers"        to="/transfers"      collapsed={collapsed} />
        </SidebarSection>

        <div className="mx-4 my-1 border-t border-white/5" />

        <SidebarSection label="Insights" collapsed={collapsed}>
          <SidebarItem icon={Heart}           label="Financial Health"   to="/financial-health" collapsed={collapsed} />
          <SidebarItem icon={LineChart}       label="Forecast"           to="/forecast"         collapsed={collapsed} />
          <SidebarItem icon={Sparkles}        label="Retirement Planner" to="/retirement"       collapsed={collapsed} />
        </SidebarSection>

        {isAdmin && (
          <>
            <div className="mx-4 my-1 border-t border-white/5" />
            <SidebarSection label="Administration" collapsed={collapsed}>
              <SidebarItem icon={Shield} label="Admin Dashboard" to="/admin" collapsed={collapsed} />
              <AdminWallSidebarItem collapsed={collapsed} isAdmin={isAdmin} />
            </SidebarSection>
          </>
        )}

        <div className="mx-4 my-1 border-t border-white/5" />

        <SidebarSection label="Other" collapsed={collapsed}>
          <SidebarItem icon={Settings}        label="Settings"           to="/settings"         collapsed={collapsed} />
          <SidebarItem icon={HelpCircle}      label="Help"               to="/help"             collapsed={collapsed} />
        </SidebarSection>
      </nav>
    </aside>
  );
};

export default Sidebar;

/* Admin Wall sidebar item with unread badge */
function AdminWallSidebarItem({ collapsed, isAdmin }) {
  const { data } = useAdminWallNotifications({
    enabled: isAdmin,
    refetchInterval: 15000,
  });
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="relative">
      <SidebarItem icon={Bell} label="Admin Wall" to="/admin/wall" collapsed={collapsed} />
      {unreadCount > 0 && (
        <span className={`
          absolute top-1.5 bg-red-500 rounded-full border-2 border-[#0B0E14]
          ${collapsed ? 'right-2 w-2.5 h-2.5' : 'left-8 w-2 h-2'}
        `} />
      )}
    </div>
  );
}
