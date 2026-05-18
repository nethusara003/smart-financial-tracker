import { Resizable } from "re-resizable";
import { ChevronDown, ChevronRight, Clock3, Folder, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useChat } from "../../hooks/useChat";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

const formatShortTime = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const getConversationPreview = (conversation) => {
  if (!conversation || !Array.isArray(conversation.messages)) {
    return "No messages yet";
  }

  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const entry = conversation.messages[index];
    if (entry?.role === "assistant" || entry?.role === "user") {
      const normalized = String(entry.content || "").trim();
      if (!normalized) {
        continue;
      }

      return normalized.length > 72 ? `${normalized.slice(0, 72).trimEnd()}...` : normalized;
    }
  }

  return "No messages yet";
};

const HistoryPanel = ({
  folders,
  activeConversationId,
  collapsedFolders,
  onToggleFolder,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
  onCloseMobile,
}) => {
  return (
    <div className="flex h-full flex-col border-r border-cyan-300/15 bg-slate-950/55 backdrop-blur-md">
      <div className="border-b border-cyan-300/15 p-3">
        <button
          type="button"
          onClick={onNewConversation}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/20"
        >
          <Plus size={15} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="space-y-3">
          {folders.map((folder) => {
            const isCollapsed = collapsedFolders[folder.id] ?? false;

            return (
              <section key={folder.id} className="rounded-2xl border border-white/10 bg-white/5 p-2">
                <button
                  type="button"
                  onClick={() => onToggleFolder(folder.id)}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-300 transition hover:bg-white/5"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Folder size={13} className="text-cyan-200/80" />
                    {folder.label}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-slate-400">{folder.count}</span>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="mt-2 space-y-1.5">
                    {folder.conversations.map((conversation) => {
                      const isActive = activeConversationId === conversation.id;

                      return (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => {
                            onSelectConversation(conversation.id);
                            onCloseMobile?.();
                          }}
                          className={`group w-full rounded-xl border px-3 py-2 text-left transition ${
                            isActive
                              ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-50"
                              : "border-transparent bg-transparent text-slate-200 hover:border-white/10 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">{conversation.title}</p>
                              <p className="mt-1 line-clamp-2 text-[11px] text-slate-300/80">
                                {getConversationPreview(conversation)}
                              </p>
                              <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-slate-400">
                                <Clock3 size={11} />
                                {formatShortTime(conversation.updatedAt)}
                              </p>
                            </div>

                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteConversation(conversation.id);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  onDeleteConversation(conversation.id);
                                }
                              }}
                              className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-red-400/20 hover:text-red-200 group-hover:opacity-100"
                              aria-label="Delete chat"
                              title="Delete chat"
                            >
                              <Trash2 size={13} />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ChatWindow = () => {
  const {
    conversationFolders,
    activeConversationId,
    setActiveConversation,
    deleteConversation,
    startNewConversation,
    isOpen,
    isMinimized,
    width,
    closeChat,
    setPanelWidth,
  } = useChat();

  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.innerWidth < 768;
  });

  const hasFolders = useMemo(
    () => Array.isArray(conversationFolders) && conversationFolders.length > 0,
    [conversationFolders]
  );

  const onResizeStop = (event, direction, ref) => {
    const nextPercent = (ref.offsetWidth / window.innerWidth) * 100;
    setPanelWidth(nextPercent);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleFolder = (folderId) => {
    setCollapsedFolders((previous) => ({
      ...previous,
      [folderId]: !(previous[folderId] ?? false),
    }));
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] bg-black/40 backdrop-blur-[12px] transition-opacity duration-300 ${
          isOpen && !isMinimized ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeChat}
      />

      <div
        className={`fixed inset-y-0 right-0 z-[80] transition-transform duration-300 ${
          isOpen && !isMinimized ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <Resizable
          size={{
            width: isMobileViewport ? "100vw" : `${width}vw`,
            height: "100vh",
          }}
          minWidth={isMobileViewport ? "100vw" : 300}
          maxWidth={isMobileViewport ? "100vw" : "75vw"}
          enable={{
            top: false,
            right: false,
            bottom: false,
            left: !isMobileViewport,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          onResizeStop={onResizeStop}
          handleStyles={{
            left: {
              width: "8px",
              left: "-4px",
              cursor: "col-resize",
            },
          }}
          className="h-screen w-screen md:w-auto"
        >
          <section className="relative flex h-full min-h-0 border-l border-cyan-300/20 bg-[#020617]/95 shadow-[0_12px_80px_rgba(2,6,23,0.75)] backdrop-blur-xl [font-family:Manrope,Sora,Segoe_UI,sans-serif]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(14,165,233,0.12),transparent_32%),radial-gradient(circle_at_90%_100%,rgba(16,185,129,0.12),transparent_28%)]" />

            {hasFolders && (
              <aside className="relative hidden w-[280px] md:block">
                <HistoryPanel
                  folders={conversationFolders}
                  activeConversationId={activeConversationId}
                  collapsedFolders={collapsedFolders}
                  onToggleFolder={toggleFolder}
                  onSelectConversation={setActiveConversation}
                  onDeleteConversation={deleteConversation}
                  onNewConversation={startNewConversation}
                />
              </aside>
            )}

            <div className="relative flex min-h-0 flex-1 flex-col">
              <ChatHeader onToggleHistory={() => setIsMobileHistoryOpen(true)} />
              <ChatMessages />
              <ChatInput />
            </div>

            {isMobileHistoryOpen && hasFolders && (
              <div className="absolute inset-0 z-20 flex md:hidden">
                <aside className="h-full w-[86%] max-w-xs">
                  <HistoryPanel
                    folders={conversationFolders}
                    activeConversationId={activeConversationId}
                    collapsedFolders={collapsedFolders}
                    onToggleFolder={toggleFolder}
                    onSelectConversation={setActiveConversation}
                    onDeleteConversation={deleteConversation}
                    onNewConversation={startNewConversation}
                    onCloseMobile={() => setIsMobileHistoryOpen(false)}
                  />
                </aside>
                <button
                  type="button"
                  className="flex-1 bg-black/45"
                  aria-label="Close chat history"
                  onClick={() => setIsMobileHistoryOpen(false)}
                />
              </div>
            )}
          </section>
        </Resizable>
      </div>

      <div
        className={`fixed bottom-6 right-6 z-[80] w-[380px] max-w-[calc(100vw-2rem)] transition-all duration-300 ${
          isOpen && isMinimized
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <section className="overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#020617]/92 shadow-2xl backdrop-blur-xl">
          <ChatHeader minimized onToggleHistory={() => setIsMobileHistoryOpen(true)} />
        </section>
      </div>
    </>
  );
};

export default ChatWindow;