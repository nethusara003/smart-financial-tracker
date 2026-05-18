import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

/* PUBLIC PAGES */
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";

/* USER PAGES */
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import AnalyticsHub from "./pages/AnalyticsHub";
import Budgets from "./pages/Budgets";
import Reports from "./pages/Reports";
import Goals from "./pages/Goals";
import BillsReminders from "./pages/BillsReminders";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import ComponentShowcase from "./pages/ComponentShowcase";

/* NEW STAGE 4 FEATURES */
import FinancialHealth from "./pages/FinancialHealth";
import ForecastPlanningHub from "./pages/ForecastPlanningHub";
import Feedback from "./pages/Feedback";

/* P2P TRANSFER FEATURE */
import TransferHub from "./pages/TransferHub";
import TransferDetails from "./pages/TransferDetails";
import Wallet from "./pages/Wallet";

/* LOAN & EMI CALCULATOR FEATURE (STAGE 5) */
import LoansHub from "./pages/LoansHub";
import LoanDetails from "./pages/LoanDetails";
import EMICalculator from "./components/loans/EMICalculator";

/* ADMIN PAGES */
import AdminDashboard from "./pages/AdminDashboard";
import AdminAcceptInvite from "./pages/AdminAcceptInvite";
import AdminNotificationWall from "./pages/AdminNotificationWall";

/* ROUTES & LAYOUT */
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import { fetchCurrentUserProfile } from "./hooks/useAuth";
import { API_BASE_URL } from "./services/apiClient";
import { queryClient } from "./lib/queryClient";
import { clearAuthStorage, getStoredAuthSnapshot, setStoredUser } from "./utils/authStorage";
import { useRef } from "react";

const AUTH_STORAGE_SCOPE_KEY = "auth_storage_scope";
const AUTH_STORAGE_SCOPE_VERSION = `v3:${API_BASE_URL}:safe-clone-2026-04-19`;
const SESSION_ACTIVITY_KEY = "session_last_activity_at";
const SESSION_TIMEOUT_LOGOUT_KEY = "session_timeout_logout_at";
const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;

function buildLoggedOutAuthState() {
  return {
    isAuthenticated: false,
    isGuest: false,
    token: null,
    user: null,
    initialized: true,
  };
}

function resolveSessionTimeoutMinutes(user) {
  const fromUser = user?.privacySettings?.sessionTimeout;
  if (fromUser !== undefined && fromUser !== null) {
    const parsed = Number.parseInt(String(fromUser), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  try {
    const persistedPrivacy = localStorage.getItem("privacySettings");
    if (persistedPrivacy) {
      const parsedPrivacy = JSON.parse(persistedPrivacy);
      const parsed = Number.parseInt(String(parsedPrivacy?.sessionTimeout || ""), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore malformed localStorage payloads.
  }

  return DEFAULT_SESSION_TIMEOUT_MINUTES;
}

function resolveAuthScope(auth) {
  if (auth?.isAuthenticated && auth?.user?.id) {
    return `user:${auth.user.id}`;
  }

  if (auth?.isGuest) {
    return "guest";
  }

  return "anonymous";
}

function resetStaleAuthScope() {
  const existingScope = localStorage.getItem(AUTH_STORAGE_SCOPE_KEY);

  if (existingScope === AUTH_STORAGE_SCOPE_VERSION) {
    return;
  }

  clearAuthStorage();
  localStorage.setItem(AUTH_STORAGE_SCOPE_KEY, AUTH_STORAGE_SCOPE_VERSION);
}

function App() {
  const previousAuthScopeRef = useRef(null);
  const [auth, setAuth] = useState(() => {
    resetStaleAuthScope();

    const { token, user, isGuest } = getStoredAuthSnapshot();

    if (token && user) {
      return {
        isAuthenticated: true,
        isGuest: false,
        token,
        user,
        initialized: true,
      };
    } else if (isGuest) {
      return {
        isAuthenticated: false,
        isGuest: true,
        token: null,
        user: null,
        initialized: true,
      };
    }
    
    return {
      ...buildLoggedOutAuthState(),
    };
  });

  const authScope = resolveAuthScope(auth);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("auth-session-changed", {
        detail: {
          authScope,
          isAuthenticated: auth.isAuthenticated,
          isGuest: auth.isGuest,
          userId: auth.user?.id || null,
        },
      })
    );

    if (previousAuthScopeRef.current && previousAuthScopeRef.current !== authScope) {
      queryClient.clear();
    }

    previousAuthScopeRef.current = authScope;
  }, [auth.isAuthenticated, auth.isGuest, auth.user?.id, authScope]);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) {
      return;
    }

    let cancelled = false;

    const syncAuthFromServer = async () => {
      try {
        const profile = await fetchCurrentUserProfile();
        if (cancelled) {
          return;
        }

        if (!profile) {
          clearAuthStorage();
          setAuth(buildLoggedOutAuthState());
          return;
        }

        if (profile.privacySettings) {
          localStorage.setItem("privacySettings", JSON.stringify(profile.privacySettings));
        }

        const normalizedUser = {
          id: profile._id || profile.id,
          name: profile.name || auth.user?.name || "",
          email: profile.email || auth.user?.email || "",
          role: profile.role || auth.user?.role || "user",
          privacySettings: profile.privacySettings || auth.user?.privacySettings,
        };

        setStoredUser(normalizedUser);

        setAuth((previous) => {
          const previousPrivacy = JSON.stringify(previous.user?.privacySettings || {});
          const nextPrivacy = JSON.stringify(normalizedUser.privacySettings || {});

          if (
            previous.user?.id === normalizedUser.id &&
            previous.user?.email === normalizedUser.email &&
            previous.user?.role === normalizedUser.role &&
            previousPrivacy === nextPrivacy
          ) {
            return previous;
          }

          return {
            ...previous,
            user: normalizedUser,
          };
        });
      } catch {
        if (cancelled) {
          return;
        }

        // Keep current session on transient profile sync errors.
        // The login/profile flows can recover on the next sync cycle.
        setAuth((previous) => previous);
      }
    };

    void syncAuthFromServer();

    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, auth.token, auth.user?.email, auth.user?.id, auth.user?.name, auth.user?.privacySettings, auth.user?.privacySettings?.sessionTimeout, auth.user?.role]);

  // Sync auth.user data to localStorage immediately for UserContext
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      if (auth.user.name) {
        localStorage.setItem("userName", auth.user.name);
      }
      if (auth.user.email) {
        localStorage.setItem("userEmail", auth.user.email);
      }
    } else {
      // Clear on logout
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
    }
  }, [auth.isAuthenticated, auth.user, auth.user?.name, auth.user?.email]);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearAuthStorage();
      setAuth(buildLoggedOutAuthState());
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) {
      return;
    }

    let timeoutHandle = null;
    let lastPersistedActivityAt = 0;

    const logoutForInactivity = () => {
      clearAuthStorage();
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.setItem(SESSION_TIMEOUT_LOGOUT_KEY, String(Date.now()));
      setAuth(buildLoggedOutAuthState());
      window.location.replace("/login");
    };

    const scheduleTimeout = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      const timeoutMinutes = resolveSessionTimeoutMinutes(auth.user);
      timeoutHandle = window.setTimeout(logoutForInactivity, timeoutMinutes * 60 * 1000);
    };

    const markActivity = (persistToStorage) => {
      if (persistToStorage) {
        const now = Date.now();
        if (now - lastPersistedActivityAt > 15 * 1000) {
          localStorage.setItem(SESSION_ACTIVITY_KEY, String(now));
          lastPersistedActivityAt = now;
        }
      }

      scheduleTimeout();
    };

    const handleStorageEvent = (event) => {
      if (event.key === SESSION_TIMEOUT_LOGOUT_KEY && event.newValue) {
        clearAuthStorage();
        setAuth(buildLoggedOutAuthState());
        window.location.replace("/login");
        return;
      }

      if (event.key === SESSION_ACTIVITY_KEY && event.newValue) {
        scheduleTimeout();
      }

      if (event.key === "privacySettings") {
        scheduleTimeout();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markActivity(false);
      }
    };

    const handlePrivacySettingsUpdated = () => {
      scheduleTimeout();
    };

    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
    const activityHandler = () => {
      markActivity(true);
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, activityHandler, { passive: true });
    });

    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("privacy-settings-updated", handlePrivacySettingsUpdated);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    markActivity(true);

    return () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, activityHandler);
      });

      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("privacy-settings-updated", handlePrivacySettingsUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [auth.isAuthenticated, auth.token, auth.user]);

  if (!auth.initialized) return null;

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/login" element={<Login setAuth={setAuth} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/accept-invite" element={<AdminAcceptInvite />} />
        
        {/* LEGAL PAGES */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* PROTECTED APP (USER + ADMIN SHARE SAME LAYOUT) */}
        <Route
          element={
            <ProtectedRoute auth={auth}>
              <AppLayout auth={auth} />
            </ProtectedRoute>
          }
        >
          {/* USER ROUTES */}
          <Route path="/dashboard" element={<Dashboard auth={auth} />} />
          <Route path="/transactions" element={<Transactions auth={auth} />} />
          <Route path="/analytics" element={<AnalyticsHub auth={auth} />} />
          <Route path="/budgets" element={<Budgets auth={auth} />} />
          <Route path="/budgets/:planId" element={<Budgets auth={auth} />} />
          <Route path="/reports" element={<Reports auth={auth} />} />
          <Route path="/goals" element={<Goals auth={auth} />} />
          <Route path="/bills-reminders" element={<BillsReminders auth={auth} />} />
          <Route path="/bills" element={<BillsReminders auth={auth} />} />
          <Route path="/reminders" element={<BillsReminders auth={auth} />} />
          <Route path="/settings" element={<Settings auth={auth} />} />
          <Route path="/help" element={<Help />} />
          <Route path="/components" element={<ComponentShowcase />} />

          {/* STAGE 4 INTELLIGENT FEATURES */}
          <Route path="/recommendations" element={<Navigate to="/financial-health" replace />} />
          <Route path="/financial-health" element={<FinancialHealth />} />
          <Route path="/forecast" element={<ForecastPlanningHub />} />
          <Route path="/retirement" element={<ForecastPlanningHub />} />
          <Route path="/feedback" element={<Feedback />} />

          {/* P2P TRANSFER FEATURE */}
          <Route path="/transfers" element={<TransferHub auth={auth} />} />
          <Route path="/transfer/:transferId" element={<TransferDetails auth={auth} />} />
          <Route path="/wallet" element={<Wallet auth={auth} />} />

          {/* LOAN & EMI CALCULATOR FEATURE (STAGE 5) */}
          <Route path="/loans" element={<LoansHub />} />
          <Route path="/loans/:id" element={<LoanDetails />} />
          <Route path="/loan-comparison" element={<Navigate to="/loans?tab=compare" replace />} />
          <Route path="/refinancing-calculator" element={<Navigate to="/loans?tab=refinancing" replace />} />
          <Route path="/debt-payoff-wizard" element={<Navigate to="/loans?tab=payoff-wizard" replace />} />
          <Route path="/emi-calculator" element={<EMICalculator />} />

          {/* ADMIN ROUTES */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute auth={auth} adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/wall"
            element={
              <ProtectedRoute auth={auth} adminOnly>
                <AdminNotificationWall />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* FALLBACK */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
