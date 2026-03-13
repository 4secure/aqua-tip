import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { GradientButton } from '../components/ui/GradientButton';
import ParticleBackground from '../components/ui/ParticleBackground';
import { forgotPassword } from '../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      await forgotPassword(email);
      setSuccessMessage(
        "If an account exists with that email, you'll receive a reset link shortly."
      );
      setEmail('');
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      } else if (err.status === 422) {
        setGeneralError(err.message);
      } else {
        setGeneralError('Unable to connect to server. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
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
              <span className="font-display text-xl font-bold text-text-primary tracking-tight">
                AQUA TIP
              </span>
            </Link>
            <h1 className="font-display text-2xl font-bold text-text-primary">Forgot password?</h1>
            <p className="font-mono text-sm text-text-secondary mt-1">
              Enter your email to receive a reset link
            </p>
          </div>

          {/* Success banner */}
          {successMessage && (
            <div className="mb-4 px-4 py-3 bg-green/10 border border-green/20 rounded-lg text-green text-sm font-mono">
              {successMessage}
            </div>
          )}

          {/* General error */}
          {generalError && (
            <div className="mb-4 px-4 py-3 bg-red/10 border border-red/20 rounded-lg text-red text-sm font-mono">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red font-mono">{errors.email[0]}</p>
              )}
            </div>

            {/* Submit */}
            <GradientButton type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </GradientButton>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-violet-light hover:text-violet transition-colors font-mono"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
