import { useState, useCallback } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Mail, Loader2 } from 'lucide-react';
import { GradientButton } from '../components/ui/GradientButton';
import ParticleBackground from '../components/ui/ParticleBackground';
import CodeInput from '../components/auth/CodeInput';
import { useAuth } from '../contexts/AuthContext';
import { verifyEmailCode, resendVerification } from '../api/auth';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, emailVerified, onboardingCompleted, logout, refreshUser } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [codeKey, setCodeKey] = useState(0);

  // Auth guards
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (emailVerified && onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }
  if (emailVerified && !onboardingCompleted) {
    return <Navigate to="/get-started" replace />;
  }

  async function handleCodeComplete(code) {
    setGeneralError('');
    setSubmitting(true);

    try {
      await verifyEmailCode(code);
      await refreshUser();
      navigate('/get-started', { replace: true });
    } catch (err) {
      const message = err.errors?.code?.[0] || err.message || 'Verification failed. Please try again.';
      setGeneralError(message);
      setCodeKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResendSuccess('');
    setGeneralError('');

    try {
      await resendVerification();
      setResendSuccess('Code sent!');
      setTimeout(() => setResendSuccess(''), 3000);
    } catch (err) {
      setGeneralError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  }

  async function handleBackToLogin() {
    try {
      await logout();
    } catch {
      // Ignore logout errors
    }
    navigate('/login', { replace: true });
  }

  return (
    <div
      className="min-h-screen bg-primary flex items-center justify-center px-4 relative"
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, rgba(122, 68, 228, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(90, 45, 184, 0.08) 0%, transparent 50%), #0A0B10',
      }}
    >
      <ParticleBackground />
      <div className="w-full max-w-md relative z-10">
        <div className="bg-surface border border-border rounded-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Aqua Tip" className="w-6 h-6" />
              <span className="font-sans text-xl font-bold text-text-primary tracking-tight">
                AQUA TIP
              </span>
            </Link>

            {/* Envelope icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet to-cyan/50 flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="font-sans text-2xl font-bold text-text-primary">Verify your email</h1>
            <p className="font-mono text-sm text-cyan mt-2">{user?.email}</p>
            <p className="font-mono text-xs text-text-secondary mt-1">
              Enter the 6-digit code we sent to your inbox
            </p>
          </div>

          {/* Error banner */}
          {generalError && (
            <div className="mb-4 px-4 py-3 bg-red/10 border border-red/20 rounded-lg text-red text-sm font-mono">
              {generalError}
            </div>
          )}

          {/* Code Input */}
          <div className="mb-4">
            {submitting ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 text-violet animate-spin" />
              </div>
            ) : (
              <CodeInput key={codeKey} onComplete={handleCodeComplete} disabled={submitting} />
            )}
          </div>

          {/* Helper text */}
          <p className="text-xs text-text-muted font-mono mt-4 text-center">
            Or click the link in your email
          </p>

          {/* Resend section */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-sm text-violet-light hover:text-violet transition-colors font-mono disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
            {resendSuccess && (
              <p className="text-xs text-green font-mono mt-2">{resendSuccess}</p>
            )}
            <p className="text-xs text-text-muted font-mono mt-2">Check your spam folder</p>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-sm text-violet-light hover:text-violet transition-colors font-mono"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
