import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGuestLogin, useLogin, useGoogleLogin } from "../hooks/useAuth";
import { storeAuthenticatedSession, storeGuestSession } from "../utils/authStorage";
import { resetUnauthorizedHandling } from "../services/apiClient";
import { Mail, Lock, TrendingUp, Shield, Zap, Eye, EyeOff, ArrowRight, User, Sparkles } from 'lucide-react';

function Login({ setAuth }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => {
    // Load remembered email on component mount
    return localStorage.getItem("rememberedEmail") || "";
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    // Check if there's a remembered email
    return !!localStorage.getItem("rememberedEmail");
  });

  const loginMutation = useLogin();
  const guestLoginMutation = useGuestLogin();
  const googleLoginMutation = useGoogleLogin();

  const handleGoogleLoginResponse = async (response) => {
    setLoading(true);
    setError("");

    try {
      const data = await googleLoginMutation.mutateAsync({
        credential: response.credential,
      });

      completeAuthenticatedLogin(data);
    } catch (error) {
      setError(error?.message || "Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId || googleClientId === "your-google-client-id") {
      return;
    }

    const initGoogle = () => {
      try {
        if (typeof window !== "undefined" && window.google) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleLoginResponse,
          });

          const buttonDiv = document.getElementById("google-signin-button");
          if (buttonDiv) {
            window.google.accounts.id.renderButton(
              buttonDiv,
              {
                theme: "filled_black",
                size: "large",
                width: 382,
                text: "signin_with",
                shape: "rectangular",
              }
            );
          }
        }
      } catch (err) {
        console.error("Google Sign-In initialization failed:", err);
      }
    };

    if (typeof window !== "undefined" && window.google) {
      initGoogle();
    } else {
      const checkInterval = setInterval(() => {
        if (typeof window !== "undefined" && window.google) {
          clearInterval(checkInterval);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeAuthenticatedLogin = (data) => {
    if (!data?.token) {
      throw new Error("Login completed without an access token. Please try again.");
    }

    const normalizedUser = {
      id: data._id || data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      privacySettings: data.privacySettings,
    };

    if (!normalizedUser.id) {
      throw new Error("Login response is missing account details. Please try again.");
    }

    // Handle Remember Me
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    storeAuthenticatedSession({
      token: data.token,
      user: normalizedUser,
      rememberMe,
    });
    resetUnauthorizedHandling();

    if (data.currency) {
      localStorage.setItem("currency", data.currency);
    }

    if (data.privacySettings) {
      localStorage.setItem("privacySettings", JSON.stringify(data.privacySettings));
      window.dispatchEvent(new CustomEvent("privacy-settings-updated"));
    }

    localStorage.removeItem("trusted_2fa_device_token");

    if (normalizedUser.name) {
      localStorage.setItem("userName", normalizedUser.name);
    }
    if (normalizedUser.email) {
      localStorage.setItem("userEmail", normalizedUser.email);
    }

    sessionStorage.removeItem("login_2fa_token");
    
    // Ensure user data is immediately available in state
    window.dispatchEvent(new CustomEvent("user-data-updated", { detail: normalizedUser }));

    setAuth({
      isAuthenticated: true,
      isGuest: false,
      token: data.token,
      user: normalizedUser,
      initialized: true,
    });

    if (data.role === "admin" || data.role === "super_admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    setLoading(true);

    try {
      const data = await loginMutation.mutateAsync({
        email,
        password,
      });

      completeAuthenticatedLogin(data);
    } catch (error) {
      setError(error?.message || "Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await guestLoginMutation.mutateAsync();

      storeGuestSession({ token: data.token, rememberMe });
      resetUnauthorizedHandling();

      setAuth({
        isAuthenticated: false,
        isGuest: true,
        token: data.token,
        user: null,
        initialized: true,
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(error?.message || "Server not reachable");
      console.error("Guest login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Deep-space background — workspace bg is #05070A (never blue) */}
      <div className="absolute inset-0" style={{ background: '#05070A' }}>
        {/* Subtle blue glow orbs — low opacity so page stays dark */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-600 rounded-full filter blur-3xl opacity-[0.07] animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-[0.06] animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-700 rounded-full filter blur-3xl opacity-[0.05] animate-blob animation-delay-4000"></div>
        
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '48px 48px'
          }}></div>
        </div>

        {/* Floating financial icons */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 animate-float" style={{ animationDelay: '0s' }}>
            <TrendingUp className="w-12 h-12 text-white/10" />
          </div>
          <div className="absolute top-1/3 right-1/4 animate-float" style={{ animationDelay: '2s' }}>
            <Shield className="w-16 h-16 text-white/10" />
          </div>
          <div className="absolute bottom-1/4 left-1/3 animate-float" style={{ animationDelay: '4s' }}>
            <Zap className="w-10 h-10 text-white/10" />
          </div>
          <div className="absolute top-1/2 right-1/3 animate- float" style={{ animationDelay: '1s' }}>
            <Sparkles className="w-14 h-14 text-white/10" />
          </div>
        </div>
      </div>

      {/* Premium glassmorphism login card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Smart Financial Tracker
            </h1>
          </div>
          <p className="text-primary-100 text-sm font-medium">Secure Financial Management Platform</p>
        </div>

        {/* Card — dark surface #0D1117 with subtle blue border accent */}
        <div className="rounded-3xl shadow-2xl overflow-hidden animate-scale-in border" style={{ background: '#0D1117', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="relative" style={{ background: '#0D1117' }}>
            {/* Header with dark gradient — matches dashboard header band */}
            <div className="relative p-8 overflow-hidden rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #0F172A, #020617)' }}>
              <div className="relative">
                <h2 className="text-2xl font-bold mb-1" style={{ color: '#F9FAFB' }}>Welcome Back</h2>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>Access your financial dashboard</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-5" style={{ background: '#0D1117' }}>
              {/* Error message */}
              {error && (
                <div className="bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800 rounded-xl p-4 animate-shake">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-danger-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <p className="text-sm font-medium text-danger-800 dark:text-danger-200">{error}</p>
                  </div>
                </div>
              )}

              {/* Email input */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold" style={{ color: '#F9FAFB' }}>
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 transition-colors" style={{ color: '#475569' }} />
                  </div>
                  <input
                    id="email"
                    data-testid="login-email-input"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ background: '#111722', borderColor: 'rgba(255,255,255,0.08)', color: '#F9FAFB' }}
                    className="block w-full pl-11 pr-4 py-3.5 rounded-xl placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all duration-200 border"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold" style={{ color: '#F9FAFB' }}>
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 transition-colors" style={{ color: '#475569' }} />
                  </div>
                  <input
                    id="password"
                    data-testid="login-password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ background: '#111722', borderColor: 'rgba(255,255,255,0.08)', color: '#F9FAFB' }}
                    className="block w-full pl-11 pr-12 py-3.5 rounded-xl placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all duration-200 border"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors"
                    style={{ color: '#475569' }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me checkbox and Forgot password */}
              <div className="flex items-center justify-between">
                {/* Remember Me checkbox */}
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-[#3B82F6] rounded cursor-pointer"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2.5 text-sm font-medium cursor-pointer select-none transition-colors"
                    style={{ color: '#9CA3AF' }}
                  >
                    Remember me
                  </label>
                </div>

                <Link
                  to="/forgot-password"
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#3B82F6' }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign in button */}
              <button
                type="submit"
                data-testid="login-submit-button"
                disabled={loading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>

              {/* Divider */}
              <>
                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 text-sm font-medium" style={{ background: '#0D1117', color: '#9CA3AF' }}>or</span>
                  </div>
                </div>

                {/* Google Sign In Container */}
                {import.meta.env.VITE_GOOGLE_CLIENT_ID && 
                 import.meta.env.VITE_GOOGLE_CLIENT_ID !== "your-google-client-id" && (
                  <div className="flex justify-center mb-3">
                    <div 
                      id="google-signin-button" 
                      className="w-full flex justify-center"
                      style={{ minHeight: '44px' }}
                    ></div>
                  </div>
                )}

                {/* Guest login button — secondary/cancel style */}
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="w-full py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 group border"
                  style={{ background: '#1E293B', borderColor: 'rgba(255,255,255,0.10)', color: '#9CA3AF' }}
                >
                  <User className="w-5 h-5" />
                  <span>Continue as Guest</span>
                </button>
              </>

              {/* Sign up link */}
              <div className="text-center pt-2">
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="font-semibold transition-colors"
                    style={{ color: '#3B82F6' }}
                  >
                    Create one now
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }}>
            <Shield className="w-4 h-4" style={{ color: '#3B82F6' }} />
            <span className="text-sm font-medium" style={{ color: '#9CA3AF' }}>Protected by enterprise-grade encryption</span>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg border mb-2" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Real-time Insights</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg border mb-2" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <Shield className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Bank-level Security</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg border mb-2" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <Zap className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Fast Analytics</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default Login;
