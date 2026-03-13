import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { GradientButton } from '../components/ui/GradientButton';
import ParticleBackground from '../components/ui/ParticleBackground';
import { useAuth } from '../contexts/AuthContext';
import { completeOnboarding } from '../api/auth';

function getDefaultName(user) {
  if (!user?.name) return '';
  // If name looks like an email prefix, don't pre-fill
  if (user.name.includes('@') || user.name === user.email?.split('@')[0]) {
    return '';
  }
  return user.name;
}

export default function GetStartedPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, emailVerified, onboardingCompleted, refreshUser } = useAuth();

  const [name, setName] = useState(getDefaultName(user));
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auth guards
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  if (onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setSubmitting(true);

    try {
      await completeOnboarding({ name: name.trim(), phone: phone || null });
      await refreshUser();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      } else if (err.status === 422) {
        setGeneralError(err.message);
      } else {
        setGeneralError('Unable to complete setup. Please try again.');
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

      {/* Phone input dark theme overrides */}
      <style>{`
        .PhoneInput {
          --PhoneInputCountryFlag-height: 1em;
          --PhoneInput-color--focus: #7A44E4;
        }
        .PhoneInputInput {
          background: #161822 !important;
          border: 1px solid #1E2030 !important;
          border-radius: 0.5rem !important;
          color: #E2E8F0 !important;
          padding: 0.625rem 0.75rem !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 0.875rem !important;
          outline: none !important;
          transition: border-color 0.2s !important;
        }
        .PhoneInputInput:focus {
          border-color: #7A44E4 !important;
        }
        .PhoneInputCountry {
          background: #161822 !important;
          border: 1px solid #1E2030 !important;
          border-radius: 0.5rem !important;
          padding: 0 0.5rem !important;
          margin-right: 0.5rem !important;
        }
        .PhoneInputCountrySelect {
          background: #0F1117 !important;
          color: #E2E8F0 !important;
        }
        .PhoneInputCountrySelectArrow {
          border-color: #E2E8F0 !important;
          opacity: 0.5 !important;
        }
      `}</style>

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
            <h1 className="font-display text-2xl font-bold text-text-primary">Complete your profile</h1>
            <p className="font-mono text-sm text-text-secondary mt-1">
              Just a few more details to get started
            </p>
          </div>

          {/* General error */}
          {generalError && (
            <div className="mb-4 px-4 py-3 bg-red/10 border border-red/20 rounded-lg text-red text-sm font-mono">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className="input-field pl-10"
                  placeholder="John Doe"
                  required
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red font-mono">{errors.name[0]}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Phone Number
              </label>
              <PhoneInput
                defaultCountry="US"
                value={phone}
                onChange={(val) => {
                  setPhone(val || '');
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                international
                countryCallingCodeEditable={false}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red font-mono">{errors.phone[0]}</p>
              )}
            </div>

            {/* Submit */}
            <GradientButton type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Setting up...' : 'Get Started'}
            </GradientButton>
          </form>
        </div>
      </div>
    </div>
  );
}
