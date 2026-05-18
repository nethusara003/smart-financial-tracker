import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ChatWindow from "../chat/ChatWindow";
import DraggableAssistant from "../chatbot/DraggableAssistant";

const PremiumLayout = ({ auth }) => {
  const isE2E = (typeof navigator !== "undefined" && navigator.webdriver) || 
                (typeof window !== "undefined" && (window.__E2E__ || window.location.search.includes("e2e=true") || localStorage.getItem("sft-e2e") === "true"));

  return (
    <div className="premium-layout-shell flex min-h-screen transition-colors">
      <Sidebar auth={auth} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar auth={auth} />

        <main
          id="main-content"
          className="premium-fab-safe premium-shell-surface flex-1 overflow-y-auto px-3 py-4 transition-all duration-300 ease-out md:px-4 md:py-5 custom-scrollbar"
        >
          <Outlet />
        </main>
      </div>

      {!isE2E && <ChatWindow />}
      {!isE2E && <DraggableAssistant />}
    </div>
  );
};

export default PremiumLayout;