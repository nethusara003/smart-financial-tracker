import { useCallback, useEffect, useMemo, useState } from "react";
import { request } from "../services/apiClient";
import { getStoredAuthSnapshot } from "../utils/authStorage";
import ChatContext from "./chatContextValue";

const CHAT_CONVERSATIONS_STORAGE_KEY = "sft.chat.conversations.v2";
const CHAT_ACTIVE_CONVERSATION_STORAGE_KEY = "sft.chat.activeConversation.v2";
const CHAT_WIDTH_STORAGE_KEY = "sft.chat.width.v1";
const CHAT_ANONYMOUS_SCOPE = "anonymous";
const DEFAULT_CHAT_WIDTH = 45;
const MIN_CHAT_WIDTH = 32;
const MAX_CHAT_WIDTH = 75;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CONTENT_CHARS = 900;
const DEFAULT_CONVERSATION_TITLE = "New Chat";
const TRACKSY_NAME = "Tracksy";

const WELCOME_MESSAGE =
  "Hello, I am Tracksy. I can help with budgets, spending patterns, debt strategy, and monthly planning. What should we optimize first?";

const clampWidth = (value) => Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, value));

const getChatSessionScope = (snapshot = getStoredAuthSnapshot()) => {
  const userId = snapshot?.user?.id || snapshot?.user?._id || null;

  if (snapshot?.token && userId) {
    return `user:${userId}`;
  }

  if (snapshot?.isGuest) {
    return "guest";
  }

  return CHAT_ANONYMOUS_SCOPE;
};

const getScopedStorageKey = (baseKey, scope) => `${baseKey}.${scope}`;

const emptyUsageTotals = () => ({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  requestCount: 0,
});

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const normalizeUsage = (usage) => {
  if (!usage || typeof usage !== "object") {
    return null;
  }

  const promptTokens = Number.isFinite(Number(usage.promptTokens))
    ? Math.max(0, Number(usage.promptTokens))
    : Number.isFinite(Number(usage.prompt_tokens))
      ? Math.max(0, Number(usage.prompt_tokens))
      : 0;

  const completionTokens = Number.isFinite(Number(usage.completionTokens))
    ? Math.max(0, Number(usage.completionTokens))
    : Number.isFinite(Number(usage.completion_tokens))
      ? Math.max(0, Number(usage.completion_tokens))
      : 0;

  const totalTokens = Number.isFinite(Number(usage.totalTokens))
    ? Math.max(0, Number(usage.totalTokens))
    : Number.isFinite(Number(usage.total_tokens))
      ? Math.max(0, Number(usage.total_tokens))
      : promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
};

const addUsageTotals = (totals, usage) => {
  const base = totals || emptyUsageTotals();
  const normalizedUsage = normalizeUsage(usage);

  if (!normalizedUsage) {
    return { ...base };
  }

  return {
    promptTokens: base.promptTokens + normalizedUsage.promptTokens,
    completionTokens: base.completionTokens + normalizedUsage.completionTokens,
    totalTokens: base.totalTokens + normalizedUsage.totalTokens,
    requestCount: base.requestCount + (normalizedUsage.totalTokens > 0 ? 1 : 0),
  };
};

const normalizeTimestamp = (value) => {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
};

const createMessage = (role, content, options = {}) => {
  const timestamp = normalizeTimestamp(options.timestamp);
  const normalizedUsage = normalizeUsage(options.usage);

  return {
    id: createId(role),
    role,
    content: String(content || "").trim(),
    timestamp,
    usage: normalizedUsage,
    model: typeof options.model === "string" ? options.model : null,
  };
};

const defaultWelcomeMessage = () =>
  createMessage("assistant", WELCOME_MESSAGE, {
    model: "welcome",
  });

const sanitizeTitle = (value) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  return normalized.length > 58 ? `${normalized.slice(0, 58).trimEnd()}...` : normalized;
};

const titleFromMessage = (message) => {
  const normalized = String(message || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  return sanitizeTitle(normalized);
};

const createConversation = (seedTitle = DEFAULT_CONVERSATION_TITLE) => {
  const timestamp = new Date().toISOString();
  return {
    id: createId("conv"),
    title: sanitizeTitle(seedTitle),
    createdAt: timestamp,
    updatedAt: timestamp,
    usageTotals: emptyUsageTotals(),
    messages: [defaultWelcomeMessage()],
  };
};

const normalizeStoredMessages = (storedValue) => {
  if (!Array.isArray(storedValue)) {
    return [defaultWelcomeMessage()];
  }

  const normalized = storedValue
    .filter((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      if (!(entry.role === "user" || entry.role === "assistant")) {
        return false;
      }

      return typeof entry.content === "string" && entry.content.trim().length > 0;
    })
    .map((entry) => ({
      id:
        typeof entry.id === "string" && entry.id.trim().length > 0
          ? entry.id
          : createId(entry.role),
      role: entry.role,
      content: entry.content.trim(),
      timestamp: normalizeTimestamp(entry.timestamp),
      usage: normalizeUsage(entry.usage),
      model: typeof entry.model === "string" ? entry.model : null,
    }));

  return normalized.length > 0 ? normalized : [defaultWelcomeMessage()];
};

const normalizeStoredConversation = (entry) => {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const id =
    typeof entry.id === "string" && entry.id.trim().length > 0 ? entry.id.trim() : createId("conv");
  const createdAt = normalizeTimestamp(entry.createdAt);
  const updatedAt = normalizeTimestamp(entry.updatedAt || entry.createdAt);

  return {
    id,
    title: sanitizeTitle(entry.title),
    createdAt,
    updatedAt,
    usageTotals: {
      ...emptyUsageTotals(),
      ...(entry.usageTotals && typeof entry.usageTotals === "object"
        ? {
            promptTokens: Math.max(0, Number(entry.usageTotals.promptTokens) || 0),
            completionTokens: Math.max(0, Number(entry.usageTotals.completionTokens) || 0),
            totalTokens: Math.max(0, Number(entry.usageTotals.totalTokens) || 0),
            requestCount: Math.max(0, Number(entry.usageTotals.requestCount) || 0),
          }
        : {}),
    },
    messages: normalizeStoredMessages(entry.messages),
  };
};

const sortConversations = (conversations) =>
  [...conversations].sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime();
    const dateB = new Date(b.updatedAt).getTime();
    return dateB - dateA;
  });

const loadStoredConversations = (scope) => {
  if (scope === "guest" || scope === CHAT_ANONYMOUS_SCOPE) {
    return [];
  }

  try {
    const raw = localStorage.getItem(getScopedStorageKey(CHAT_CONVERSATIONS_STORAGE_KEY, scope));
    if (!raw) {
      return [createConversation()];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [createConversation()];
    }

    const normalized = parsed.map(normalizeStoredConversation).filter(Boolean);
    return normalized.length > 0 ? sortConversations(normalized) : [createConversation()];
  } catch {
    return [createConversation()];
  }
};

const loadStoredActiveConversationId = (scope) => {
  if (scope === "guest" || scope === CHAT_ANONYMOUS_SCOPE) {
    return null;
  }

  try {
    const raw = localStorage.getItem(getScopedStorageKey(CHAT_ACTIVE_CONVERSATION_STORAGE_KEY, scope));
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return null;
    }

    return raw.trim();
  } catch {
    return null;
  }
};

const loadStoredWidth = () => {
  try {
    const raw = localStorage.getItem(CHAT_WIDTH_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_CHAT_WIDTH;
    }

    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      return DEFAULT_CHAT_WIDTH;
    }

    // If the stored width is too narrow/shrinked, reset it to the default comfortable width
    if (parsed < 35) {
      return DEFAULT_CHAT_WIDTH;
    }

    return clampWidth(parsed);
  } catch {
    return DEFAULT_CHAT_WIDTH;
  }
};

const formatFolderLabel = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
};

const folderKeyFromTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const buildConversationFolders = (conversations) => {
  const grouped = conversations.reduce((accumulator, conversation) => {
    const key = folderKeyFromTimestamp(conversation.updatedAt);
    const existing = accumulator.get(key);

    if (existing) {
      existing.conversations.push(conversation);
      return accumulator;
    }

    accumulator.set(key, {
      id: key,
      label: formatFolderLabel(conversation.updatedAt),
      conversations: [conversation],
    });

    return accumulator;
  }, new Map());

  return [...grouped.values()]
    .map((folder) => ({
      ...folder,
      count: folder.conversations.length,
      conversations: sortConversations(folder.conversations),
    }))
    .sort((a, b) => b.id.localeCompare(a.id));
};

export const ChatProvider = ({ children }) => {
  const initialSessionScope = getChatSessionScope();
  const [sessionScope, setSessionScope] = useState(initialSessionScope);
  const [conversations, setConversations] = useState(() => loadStoredConversations(initialSessionScope));
  const [activeConversationId, setActiveConversationId] = useState(() =>
    loadStoredActiveConversationId(initialSessionScope)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [width, setWidth] = useState(loadStoredWidth);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const [isGuestSession, setIsGuestSession] = useState(initialSessionScope === "guest");

  useEffect(() => {
    const syncSessionScope = (snapshot) => {
      const nextScope = getChatSessionScope(snapshot);
      setSessionScope((currentScope) => (currentScope === nextScope ? currentScope : nextScope));
      setIsGuestSession(nextScope === "guest");
    };

    const handleAuthSessionChanged = (event) => {
      syncSessionScope(event?.detail);
    };

    const handleStorage = (event) => {
      if (event.key === "token" || event.key === "user" || event.key === "guest") {
        syncSessionScope(getStoredAuthSnapshot());
      }
    };

    syncSessionScope(getStoredAuthSnapshot());

    window.addEventListener("auth-session-changed", handleAuthSessionChanged);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("auth-session-changed", handleAuthSessionChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (sessionScope === "guest" || sessionScope === CHAT_ANONYMOUS_SCOPE) {
      localStorage.removeItem(getScopedStorageKey(CHAT_CONVERSATIONS_STORAGE_KEY, sessionScope));
      return;
    }

    localStorage.setItem(
      getScopedStorageKey(CHAT_CONVERSATIONS_STORAGE_KEY, sessionScope),
      JSON.stringify(conversations)
    );
  }, [conversations, sessionScope]);

  useEffect(() => {
    if (sessionScope === "guest" || sessionScope === CHAT_ANONYMOUS_SCOPE) {
      localStorage.removeItem(getScopedStorageKey(CHAT_ACTIVE_CONVERSATION_STORAGE_KEY, sessionScope));
      return;
    }

    if (activeConversationId) {
      localStorage.setItem(
        getScopedStorageKey(CHAT_ACTIVE_CONVERSATION_STORAGE_KEY, sessionScope),
        activeConversationId
      );
      return;
    }

    localStorage.removeItem(getScopedStorageKey(CHAT_ACTIVE_CONVERSATION_STORAGE_KEY, sessionScope));
  }, [activeConversationId, sessionScope]);

  useEffect(() => {
    localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(width));
  }, [width]);

  useEffect(() => {
    if (sessionScope === "guest" || sessionScope === CHAT_ANONYMOUS_SCOPE) {
      setConversations([]);
      setActiveConversationId(null);
      setError("");
      setIsTyping(false);
      return;
    }

    const nextConversations = loadStoredConversations(sessionScope);
    const nextActiveConversationId = loadStoredActiveConversationId(sessionScope);

    setConversations(nextConversations);
    setActiveConversationId(nextActiveConversationId || nextConversations[0]?.id || null);
    setError("");
    setIsTyping(false);
  }, [sessionScope]);

  useEffect(() => {
    if (sessionScope === "guest" || sessionScope === CHAT_ANONYMOUS_SCOPE) {
      return;
    }

    if (conversations.length === 0) {
      const freshConversation = createConversation();
      setConversations([freshConversation]);
      setActiveConversationId(freshConversation.id);
      return;
    }

    if (!activeConversationId) {
      setActiveConversationId(conversations[0].id);
      return;
    }

    const hasActiveConversation = conversations.some(
      (conversation) => conversation.id === activeConversationId
    );

    if (!hasActiveConversation) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations, sessionScope]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const minimizeChat = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(true);
  }, []);

  const restoreChat = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const setActiveConversation = useCallback((conversationId) => {
    if (typeof conversationId !== "string" || conversationId.trim().length === 0) {
      return;
    }

    setActiveConversationId(conversationId);
    setIsOpen(true);
    setIsMinimized(false);
    setError("");
  }, []);

  const startNewConversation = useCallback(() => {
    const nextConversation = createConversation();
    setConversations((previous) => sortConversations([nextConversation, ...previous]));
    setActiveConversationId(nextConversation.id);
    setError("");
    setIsOpen(true);
    setIsMinimized(false);
    return nextConversation.id;
  }, []);

  const deleteConversation = useCallback((conversationId) => {
    if (typeof conversationId !== "string" || conversationId.trim().length === 0) {
      return;
    }

    setConversations((previous) => {
      const filtered = previous.filter((conversation) => conversation.id !== conversationId);
      return filtered.length > 0 ? filtered : [createConversation()];
    });

    setActiveConversationId((current) =>
      current === conversationId ? null : current
    );
    setError("");
  }, []);

  const clearMessages = useCallback(() => {
    setConversations((previous) =>
      sortConversations(
        previous.map((conversation) => {
          if (conversation.id !== activeConversationId) {
            return conversation;
          }

          const timestamp = new Date().toISOString();
          return {
            ...conversation,
            title: DEFAULT_CONVERSATION_TITLE,
            updatedAt: timestamp,
            usageTotals: emptyUsageTotals(),
            messages: [defaultWelcomeMessage()],
          };
        })
      )
    );
    setError("");
  }, [activeConversationId]);

  const setPanelWidth = useCallback((nextWidth) => {
    if (typeof nextWidth !== "number" || Number.isNaN(nextWidth)) {
      return;
    }

    setWidth(clampWidth(nextWidth));
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [activeConversationId, conversations]
  );

  const sendChatMessage = useCallback(
    async (rawMessage) => {
      const content = String(rawMessage || "").trim();
      if (!content || isTyping) {
        return;
      }

      let targetConversation = activeConversation;
      let targetConversationId = activeConversationId;

      if (!targetConversation || !targetConversationId) {
        const created = createConversation();
        targetConversation = created;
        targetConversationId = created.id;
        setConversations((previous) => sortConversations([created, ...previous]));
        setActiveConversationId(created.id);
      }

      const userMessage = createMessage("user", content);
      const requestHistory = [...(targetConversation?.messages || []), userMessage]
        .filter((entry) => entry.role === "user" || entry.role === "assistant")
        .slice(-MAX_HISTORY_MESSAGES)
        .map((entry) => ({
          role: entry.role,
          content: String(entry.content || "").slice(0, MAX_HISTORY_CONTENT_CHARS),
        }));

      setError("");
      setIsTyping(true);

      setConversations((previous) =>
        sortConversations(
          previous.map((conversation) => {
            if (conversation.id !== targetConversationId) {
              return conversation;
            }

            const previousUserMessageCount = conversation.messages.filter(
              (entry) => entry.role === "user"
            ).length;
            const nextTitle =
              previousUserMessageCount === 0
                ? titleFromMessage(content)
                : conversation.title;

            return {
              ...conversation,
              title: nextTitle,
              updatedAt: userMessage.timestamp,
              messages: [...conversation.messages, userMessage],
            };
          })
        )
      );

      try {
        const payload = await request("/chat", {
          method: "POST",
          body: {
            message: content,
            history: requestHistory,
            sessionId: targetConversationId,
          },
          fallbackMessage: "Failed to reach Tracksy service",
        });

        const aiReply = typeof payload?.reply === "string" ? payload.reply.trim() : "";
        if (!aiReply) {
          throw new Error("Tracksy returned an empty reply.");
        }

        const assistantMessage = createMessage("assistant", aiReply, {
          usage: payload?.usage,
          model: payload?.model,
        });

        setConversations((previous) =>
          sortConversations(
            previous.map((conversation) => {
              if (conversation.id !== targetConversationId) {
                return conversation;
              }

              return {
                ...conversation,
                updatedAt: assistantMessage.timestamp,
                usageTotals: addUsageTotals(conversation.usageTotals, assistantMessage.usage),
                messages: [...conversation.messages, assistantMessage],
              };
            })
          )
        );
      } catch (requestError) {
        const nextError =
          requestError?.message || "Something went wrong while contacting Tracksy.";
        setError(nextError);

        const assistantMessage = createMessage("assistant", nextError, {
          model: "request-error",
        });

        setConversations((previous) =>
          sortConversations(
            previous.map((conversation) => {
              if (conversation.id !== targetConversationId) {
                return conversation;
              }

              return {
                ...conversation,
                updatedAt: assistantMessage.timestamp,
                messages: [...conversation.messages, assistantMessage],
              };
            })
          )
        );
      } finally {
        setIsTyping(false);
      }
    },
    [activeConversation, activeConversationId, isTyping]
  );

  const conversationFolders = useMemo(
    () => buildConversationFolders(conversations),
    [conversations]
  );

  const totalUsage = useMemo(
    () =>
      conversations.reduce(
        (accumulator, conversation) => ({
          promptTokens: accumulator.promptTokens + (conversation.usageTotals?.promptTokens || 0),
          completionTokens:
            accumulator.completionTokens + (conversation.usageTotals?.completionTokens || 0),
          totalTokens: accumulator.totalTokens + (conversation.usageTotals?.totalTokens || 0),
          requestCount: accumulator.requestCount + (conversation.usageTotals?.requestCount || 0),
        }),
        emptyUsageTotals()
      ),
    [conversations]
  );

  const lastResponseUsage = useMemo(() => {
    if (!activeConversation) {
      return null;
    }

    for (let index = activeConversation.messages.length - 1; index >= 0; index -= 1) {
      const entry = activeConversation.messages[index];
      if (entry.role === "assistant" && entry.usage) {
        return entry.usage;
      }
    }

    return null;
  }, [activeConversation]);

  const value = useMemo(
    () => ({
      assistantName: TRACKSY_NAME,
      isGuestSession,
      conversations,
      conversationFolders,
      activeConversationId,
      activeConversation,
      messages: activeConversation?.messages || [],
      usageTotals: activeConversation?.usageTotals || emptyUsageTotals(),
      totalUsage,
      lastResponseUsage,
      isOpen,
      isMinimized,
      width,
      isTyping,
      error,
      sessionScope,
      openChat,
      closeChat,
      minimizeChat,
      restoreChat,
      setActiveConversation,
      startNewConversation,
      deleteConversation,
      clearMessages,
      setPanelWidth,
      sendChatMessage,
    }),
    [
      conversations,
      conversationFolders,
      activeConversationId,
      activeConversation,
      totalUsage,
      lastResponseUsage,
      isOpen,
      isMinimized,
      width,
      isTyping,
      error,
      isGuestSession,
      sessionScope,
      openChat,
      closeChat,
      minimizeChat,
      restoreChat,
      setActiveConversation,
      startNewConversation,
      deleteConversation,
      clearMessages,
      setPanelWidth,
      sendChatMessage,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;