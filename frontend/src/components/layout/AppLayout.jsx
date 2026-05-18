import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ChatWindow from "../chat/ChatWindow";
import DraggableAssistant from "../chatbot/DraggableAssistant";

const AppLayout = ({ auth }) => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sft-sidebar-collapsed') === 'true'
  );
  
  useEffect(() => {
    localStorage.setItem('sft-sidebar-collapsed', collapsed);
  }, [collapsed]);

  const isE2E = (typeof navigator !== "undefined" && navigator.webdriver) || 
                (typeof window !== "undefined" && (window.__E2E__ || window.location.search.includes("e2e=true") || localStorage.getItem("sft-e2e") === "true"));

  return (
    <div className="flex h-screen overflow-hidden bg-[#05070A]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} auth={auth} />
      {/* Main expands via flex — no margin-left, no JS width calc */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar auth={auth} />
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {!isE2E && <ChatWindow />}
      {!isE2E && <DraggableAssistant />}
    </div>
  );
};

export default AppLayout;
