import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRegister } from "../hooks/useAuth";
import { Mail, Lock, User, Check, TrendingUp, Shield, Zap, Eye, EyeOff, ArrowRight, Sparkles, UserPlus } from 'lucide-react';

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const registerMutation = useRegister();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const strongPassword =
      password.length >= 8 &&
      /[a-zA-Z]/.test(password) &&
      /\d/.test(password);

    if (!strongPassword) {
      setError("Password must be at least 8 characters long, and contain both letters and numbers");
      return;
    }

    try {
      setLoading(true);

      await registerMutation.mutateAsync({
        name,
        email,
        password,
      });

      setMessage("Account created successfully! Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    let strength = 0;
    
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /\d/.test(pwd);
    const hasSpecial = /[^a-zA-Z\d]/.test(pwd);
    
    if (pwd.length >= 8 && hasLetters && hasNumbers) {
      strength = 2; // Fair
      if (pwd.length >= 10) strength++;
      if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
      if (hasSpecial) strength++;
    } else {
      strength = 1; // Weak
    }

    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['', 'bg-danger-500', 'bg-warning-500', 'bg-warning-400', 'bg-success-500', 'bg-success-600'];
    
    return { strength, label: labels[strength], color: colors[strength] };
  };

  const passwordStrength = getPasswordStrength(password);

  // Email validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Premium animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-accent-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        
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
            <UserPlus className="w-10 h-10 text-white/10" />
          </div>
          <div className="absolute top-1/2 right-1/3 animate-float" style={{ animationDelay: '1s' }}>
            <Sparkles className="w-14 h-14 text-white/10" />
          </div>
        </div>
      </div>

      {/* Premium glassmorphism register card */}
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
          <p className="text-primary-100 text-sm font-medium">Start Your Financial Journey Today</p>
        </div>

        {/* Glassmorphism card */}
        <div className="backdrop-blur-2xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-scale-in">
          {/* Card glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 to-secondary-400 rounded-3xl blur opacity-20"></div>
          
          <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl">
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 p-8 overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `linear-gradient(45deg, transparent 45%, white 50%, transparent 55%)`,
                backgroundSize: '20px 20px'
              }}></div>
              <div className="relative">
                <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>
                <p className="text-primary-50 text-sm">Join thousands managing their finances</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {/* Success message */}
              {message && (
                <div className="bg-success-50 dark:bg-success-900/30 border border-success-200 dark:border-success-800 rounded-xl p-4 animate-scale-in">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-success-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-sm font-medium text-success-800 dark:text-success-200">{message}</p>
                  </div>
                </div>
              )}

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

              {/* Name input */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    id="name"
                    data-testid="register-name-input"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="block w-full pl-11 pr-11 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                  />
                  {name && name.length >= 2 && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <Check className="h-5 w-5 text-success-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Email input */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    id="email"
                    data-testid="register-email-input"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-11 pr-11 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                  />
                  {email && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      {isValidEmail(email) ? (
                        <Check className="h-5 w-5 text-success-500" />
                      ) : (
                        <span className="w-1.5 h-1.5 bg-danger-500 rounded-full animate-pulse"></span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    id="password"
                    data-testid="register-password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-11 pr-12 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            level <= passwordStrength.strength
                              ? passwordStrength.color
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    {passwordStrength.label && (
                      <p className={`text-xs font-medium flex items-center gap-1.5 ${
                        passwordStrength.strength >= 4 ? 'text-success-600 dark:text-success-400' :
                        passwordStrength.strength >= 3 ? 'text-warning-600 dark:text-warning-400' :
                        'text-danger-600 dark:text-danger-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          passwordStrength.strength >= 4 ? 'bg-success-500' :
                          passwordStrength.strength >= 3 ? 'bg-warning-500' :
                          'bg-danger-500'
                        } animate-pulse`}></div>
                        Password strength: <span className="font-semibold">{passwordStrength.label}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password input */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Confirm Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    id="confirmPassword"
                    data-testid="register-confirm-password-input"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="block w-full pl-11 pr-12 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-danger-600 dark:text-danger-400 flex items-center gap-1.5 mt-2 font-medium">
                    <span className="w-1.5 h-1.5 bg-danger-600 dark:bg-danger-400 rounded-full animate-pulse"></span>
                    Passwords don't match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-success-600 dark:text-success-400 flex items-center gap-1.5 mt-2 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    Passwords match perfectly
                  </p>
                )}
              </div>

              {/* Create account button */}
              <button
                type="submit"
                data-testid="register-submit-button"
                disabled={loading || !name || !email || !password || !confirmPassword || password !== confirmPassword}
                className="w-full relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group mt-6"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>Create Account</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>

              {/* Sign in link */}
              <div className="text-center pt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Terms */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
                By creating an account, you agree to our{' '}
                <Link
                  to="/terms"
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 underline hover:no-underline transition-all"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy"
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 underline hover:no-underline transition-all"
                >
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Benefits - NEW */}
        <div className="mt-6 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                <span className="text-xs text-white/90 font-medium">Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                <span className="text-xs text-white/90 font-medium">No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                <span className="text-xs text-white/90 font-medium">Full access</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                <span className="text-xs text-white/90 font-medium">Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <Shield className="w-4 h-4 text-primary-200" />
            <span className="text-sm text-primary-50 font-medium">Your data is encrypted and secure</span>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 mb-2">
              <TrendingUp className="w-5 h-5 text-primary-200" />
            </div>
            <p className="text-xs text-primary-100 font-medium">Smart Analytics</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 mb-2">
              <Shield className="w-5 h-5 text-primary-200" />
            </div>
            <p className="text-xs text-primary-100 font-medium">100% Secure</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 mb-2">
              <Zap className="w-5 h-5 text-primary-200" />
            </div>
            <p className="text-xs text-primary-100 font-medium">Lightning Fast</p>
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

export default Register;
