import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { GradientButton } from '../components/ui/GradientButton';
import ParticleBackground from '../components/ui/ParticleBackground';
import SocialAuthButtons from '../components/auth/SocialAuthButtons';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setSubmitting(true);

    try {
      await register({ email: form.email, password: form.password });
      navigate('/verify-email', { replace: true });
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
    <div className="min-h-screen bg-primary flex items-center justify-center px-4 relative" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(122, 68, 228, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(90, 45, 184, 0.08) 0%, transparent 50%), #0A0B10' }}>
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
            <h1 className="font-sans text-2xl font-bold text-text-primary">Create an account</h1>
            <p className="font-mono text-sm text-text-secondary mt-1">Get started with AQUA TIP</p>
          </div>

          {/* General error */}
          {generalError && (
            <div className="mb-4 px-4 py-3 bg-red/10 border border-red/20 rounded-lg text-red text-sm font-mono">
              {generalError}
            </div>
          )}

          {/* Social Sign Up */}
          <SocialAuthButtons setGeneralError={setGeneralError} />

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-muted font-mono uppercase">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red font-mono">{errors.email[0]}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted font-mono">Min 8 characters, mixed case, at least one number</p>
              {errors.password && (
                <p className="mt-1 text-xs text-red font-mono">{errors.password[0]}</p>
              )}
            </div>

            {/* Legal Checkbox */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border bg-surface-2 text-violet focus:ring-violet"
              />
              <span className="text-xs text-text-secondary font-mono">
                I agree to the{' '}
                <Link to="/eula" target="_blank" className="text-violet-light hover:text-violet">EULA</Link>
                {' '}and acknowledge the{' '}
                <Link to="/privacy-policy" target="_blank" className="text-violet-light hover:text-violet">Privacy Policy</Link>
              </span>
            </label>

            {/* Submit */}
            <GradientButton type="submit" disabled={!agreedToTerms || submitting} className="w-full">
              {submitting ? 'Creating account...' : 'Create Account'}
            </GradientButton>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-text-secondary font-mono">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-light hover:text-violet transition-colors font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
