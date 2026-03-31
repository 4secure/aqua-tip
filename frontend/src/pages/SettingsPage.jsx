import { useState, useRef, useMemo, useCallback } from 'react';
import { User, Building2, Lock, Mail, Github, Chrome, Calendar, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../api/auth';
import { GradientButton } from '../components/ui/GradientButton';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import SimpleDropdown from '../components/ui/SimpleDropdown';
import PhoneNumberInput from '../components/ui/PhoneNumberInput';
import Toast from '../components/ui/Toast';

const ROLE_OPTIONS = [
  'Security Analyst',
  'SOC Analyst',
  'Threat Hunter',
  'Incident Responder',
  'CISO/Manager',
  'Researcher',
  'Student',
  'Other',
];

function getUtcOffset(timeZone) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart?.value || 'UTC';
  } catch {
    return 'UTC';
  }
}

function getInitialRole(userRole) {
  if (!userRole) return { role: '', customRole: '' };
  if (ROLE_OPTIONS.includes(userRole)) return { role: userRole, customRole: '' };
  return { role: 'Other', customRole: userRole };
}

function getEffectiveRole(role, customRole) {
  if (role === 'Other') return customRole.trim() || '';
  return role;
}

function formatMemberSince(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function OAuthBadge({ provider }) {
  if (provider === 'google') {
    return (
      <span className="inline-flex items-center gap-1 mt-1 text-xs text-text-muted">
        <Chrome className="w-3.5 h-3.5" /> Signed in with Google
      </span>
    );
  }
  if (provider === 'github') {
    return (
      <span className="inline-flex items-center gap-1 mt-1 text-xs text-text-muted">
        <Github className="w-3.5 h-3.5" /> Signed in with GitHub
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 mt-1 text-xs text-text-muted">
      <Mail className="w-3.5 h-3.5" /> Signed in with email
    </span>
  );
}

export default function SettingsPage() {
  const { user, userInitials, refreshUser } = useAuth();

  const { role: initialRoleDropdown, customRole: initialCustomRole } = useMemo(
    () => getInitialRole(user?.role),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const initialValues = useRef({
    name: user?.name || '',
    phone: user?.phone || '',
    timezone: user?.timezone || 'UTC',
    organization: user?.organization || '',
    effectiveRole: getEffectiveRole(initialRoleDropdown, initialCustomRole),
  });

  const [form, setForm] = useState({
    name: initialValues.current.name,
    phone: initialValues.current.phone,
    timezone: initialValues.current.timezone,
    organization: initialValues.current.organization,
    role: initialRoleDropdown,
  });

  const [customRole, setCustomRole] = useState(initialCustomRole);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const timezoneOptions = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone').map((tz) => ({
        value: tz,
        label: `${tz} (${getUtcOffset(tz)})`,
      }));
    } catch {
      return [{ value: 'UTC', label: 'UTC (UTC)' }];
    }
  }, []);

  const isDirty = useMemo(() => {
    const init = initialValues.current;
    if (form.name !== init.name) return true;
    if (form.phone !== init.phone) return true;
    if (form.timezone !== init.timezone) return true;
    if (form.organization !== init.organization) return true;
    const currentEffective = getEffectiveRole(form.role, customRole);
    if (currentEffective !== init.effectiveRole) return true;
    return false;
  }, [form, customRole]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const finalRole = form.role === 'Other'
        ? (customRole.trim() || null)
        : (form.role || null);

      await updateProfile({
        name: form.name.trim(),
        phone: form.phone || null,
        timezone: form.timezone,
        organization: form.organization.trim() || null,
        role: finalRole,
      });

      await refreshUser();

      const effectiveRole = finalRole || '';
      initialValues.current = {
        name: form.name.trim(),
        phone: form.phone || '',
        timezone: form.timezone,
        organization: form.organization.trim() || '',
        effectiveRole,
      };

      // Sync form state with trimmed values
      setForm((prev) => ({
        ...prev,
        name: form.name.trim(),
        organization: form.organization.trim() || '',
      }));

      setToast({ message: 'Profile updated', type: 'success' });
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setToast({ message: err.message || 'Failed to update profile', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-sans text-xl font-bold">Settings</h1>
        <p className="text-sm text-text-muted mt-1">Manage your profile and account</p>
      </div>

      {/* Single glassmorphism card */}
      <div className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-6 max-w-2xl">
        {/* Profile header with avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-violet/20 border border-violet/30 flex items-center justify-center text-violet text-lg font-bold">
              {userInitials}
            </div>
          )}
          <div>
            <h2 className="font-sans text-lg font-bold">{user?.name}</h2>
            <p className="text-sm text-text-muted">{user?.email}</p>
            <OAuthBadge provider={user?.oauth_provider} />
          </div>
        </div>

        {/* Account info row - read-only */}
        <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-border">
          {/* Plan chip */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border">
            <Shield className="w-4 h-4 text-violet" />
            <span className="text-sm">{user?.plan?.name || 'Free'} Plan</span>
            {user?.trial_active && (
              <span className="text-xs text-amber">({user.trial_days_left}d trial)</span>
            )}
          </div>
          {/* Member since */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border">
            <Calendar className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-muted">
              Member since {formatMemberSince(user?.created_at)}
            </span>
          </div>
        </div>

        {/* Editable form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Name field */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="input-field pl-10"
                placeholder="John Doe"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red font-mono">{errors.name[0]}</p>
            )}
          </div>

          {/* Email field - READ ONLY */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                value={user?.email || ''}
                className="input-field pl-10 opacity-60 cursor-not-allowed"
                readOnly
              />
            </div>
            <p className="mt-1 text-xs text-text-muted">Email cannot be changed</p>
          </div>

          {/* Phone field */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Phone Number
            </label>
            <PhoneNumberInput
              defaultCountry="PH"
              value={form.phone}
              onChange={(val) => {
                updateField('phone', val || '');
              }}
              error={errors.phone?.[0]}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red font-mono">{errors.phone[0]}</p>
            )}
          </div>

          {/* Organization field */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">
              Organization
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={form.organization}
                onChange={(e) => updateField('organization', e.target.value)}
                className="input-field pl-10"
                placeholder="Your company or team"
              />
            </div>
            {errors.organization && (
              <p className="mt-1 text-xs text-red font-mono">{errors.organization[0]}</p>
            )}
          </div>

          {/* Role field */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Role</label>
            <SimpleDropdown
              options={ROLE_OPTIONS}
              value={form.role}
              onChange={(val) => {
                updateField('role', val);
                if (val !== 'Other') setCustomRole('');
              }}
              placeholder="Select your role"
              error={errors.role?.[0]}
              otherValue={customRole}
              onOtherChange={(val) => {
                setCustomRole(val);
                setErrors((prev) => ({ ...prev, role: undefined }));
              }}
            />
            {errors.role && (
              <p className="mt-1 text-xs text-red font-mono">{errors.role[0]}</p>
            )}
          </div>

          {/* Timezone field */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Timezone
            </label>
            <SearchableDropdown
              options={timezoneOptions}
              value={form.timezone}
              onChange={(val) => updateField('timezone', val)}
              placeholder="Search timezone..."
              error={errors.timezone?.[0]}
            />
            {errors.timezone && (
              <p className="mt-1 text-xs text-red font-mono">{errors.timezone[0]}</p>
            )}
          </div>

          {/* Save button */}
          <div className="pt-4">
            <GradientButton
              type="submit"
              disabled={!isDirty || saving}
              className="w-full sm:w-auto px-8"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </GradientButton>
          </div>
        </form>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
