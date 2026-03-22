import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import 'flag-icons/css/flag-icons.min.css';

const COUNTRIES = [
  { code: 'us', name: 'United States', dial: '+1' },
  { code: 'gb', name: 'United Kingdom', dial: '+44' },
  { code: 'ph', name: 'Philippines', dial: '+63' },
  { code: 'in', name: 'India', dial: '+91' },
  { code: 'au', name: 'Australia', dial: '+61' },
  { code: 'ca', name: 'Canada', dial: '+1' },
  { code: 'de', name: 'Germany', dial: '+49' },
  { code: 'fr', name: 'France', dial: '+33' },
  { code: 'jp', name: 'Japan', dial: '+81' },
  { code: 'kr', name: 'South Korea', dial: '+82' },
  { code: 'cn', name: 'China', dial: '+86' },
  { code: 'sg', name: 'Singapore', dial: '+65' },
  { code: 'ae', name: 'UAE', dial: '+971' },
  { code: 'sa', name: 'Saudi Arabia', dial: '+966' },
  { code: 'br', name: 'Brazil', dial: '+55' },
  { code: 'mx', name: 'Mexico', dial: '+52' },
  { code: 'it', name: 'Italy', dial: '+39' },
  { code: 'es', name: 'Spain', dial: '+34' },
  { code: 'nl', name: 'Netherlands', dial: '+31' },
  { code: 'se', name: 'Sweden', dial: '+46' },
  { code: 'no', name: 'Norway', dial: '+47' },
  { code: 'dk', name: 'Denmark', dial: '+45' },
  { code: 'fi', name: 'Finland', dial: '+358' },
  { code: 'ch', name: 'Switzerland', dial: '+41' },
  { code: 'at', name: 'Austria', dial: '+43' },
  { code: 'be', name: 'Belgium', dial: '+32' },
  { code: 'pt', name: 'Portugal', dial: '+351' },
  { code: 'ie', name: 'Ireland', dial: '+353' },
  { code: 'nz', name: 'New Zealand', dial: '+64' },
  { code: 'za', name: 'South Africa', dial: '+27' },
  { code: 'il', name: 'Israel', dial: '+972' },
  { code: 'th', name: 'Thailand', dial: '+66' },
  { code: 'my', name: 'Malaysia', dial: '+60' },
  { code: 'id', name: 'Indonesia', dial: '+62' },
  { code: 'vn', name: 'Vietnam', dial: '+84' },
  { code: 'tw', name: 'Taiwan', dial: '+886' },
  { code: 'hk', name: 'Hong Kong', dial: '+852' },
  { code: 'pk', name: 'Pakistan', dial: '+92' },
  { code: 'bd', name: 'Bangladesh', dial: '+880' },
  { code: 'ng', name: 'Nigeria', dial: '+234' },
  { code: 'eg', name: 'Egypt', dial: '+20' },
  { code: 'ke', name: 'Kenya', dial: '+254' },
  { code: 'gh', name: 'Ghana', dial: '+233' },
  { code: 'co', name: 'Colombia', dial: '+57' },
  { code: 'ar', name: 'Argentina', dial: '+54' },
  { code: 'cl', name: 'Chile', dial: '+56' },
  { code: 'pl', name: 'Poland', dial: '+48' },
  { code: 'ro', name: 'Romania', dial: '+40' },
  { code: 'cz', name: 'Czech Republic', dial: '+420' },
  { code: 'tr', name: 'Turkey', dial: '+90' },
  { code: 'ru', name: 'Russia', dial: '+7' },
  { code: 'ua', name: 'Ukraine', dial: '+380' },
];

// Map IANA timezone to country code for auto-detection
const TIMEZONE_TO_COUNTRY = {
  'America/New_York': 'us', 'America/Chicago': 'us', 'America/Denver': 'us',
  'America/Los_Angeles': 'us', 'America/Anchorage': 'us', 'Pacific/Honolulu': 'us',
  'Europe/London': 'gb', 'Asia/Manila': 'ph', 'Asia/Kolkata': 'in', 'Asia/Calcutta': 'in',
  'Australia/Sydney': 'au', 'Australia/Melbourne': 'au', 'Australia/Perth': 'au',
  'America/Toronto': 'ca', 'America/Vancouver': 'ca', 'Europe/Berlin': 'de',
  'Europe/Paris': 'fr', 'Asia/Tokyo': 'jp', 'Asia/Seoul': 'kr', 'Asia/Shanghai': 'cn',
  'Asia/Singapore': 'sg', 'Asia/Dubai': 'ae', 'Asia/Riyadh': 'sa',
  'America/Sao_Paulo': 'br', 'America/Mexico_City': 'mx', 'Europe/Rome': 'it',
  'Europe/Madrid': 'es', 'Europe/Amsterdam': 'nl', 'Europe/Stockholm': 'se',
  'Europe/Oslo': 'no', 'Europe/Copenhagen': 'dk', 'Europe/Helsinki': 'fi',
  'Europe/Zurich': 'ch', 'Europe/Vienna': 'at', 'Europe/Brussels': 'be',
  'Europe/Lisbon': 'pt', 'Europe/Dublin': 'ie', 'Pacific/Auckland': 'nz',
  'Africa/Johannesburg': 'za', 'Asia/Jerusalem': 'il', 'Asia/Bangkok': 'th',
  'Asia/Kuala_Lumpur': 'my', 'Asia/Jakarta': 'id', 'Asia/Ho_Chi_Minh': 'vn',
  'Asia/Taipei': 'tw', 'Asia/Hong_Kong': 'hk', 'Asia/Karachi': 'pk',
  'Asia/Dhaka': 'bd', 'Africa/Lagos': 'ng', 'Africa/Cairo': 'eg',
  'Africa/Nairobi': 'ke', 'Africa/Accra': 'gh', 'America/Bogota': 'co',
  'America/Argentina/Buenos_Aires': 'ar', 'America/Santiago': 'cl',
  'Europe/Warsaw': 'pl', 'Europe/Bucharest': 'ro', 'Europe/Prague': 'cz',
  'Europe/Istanbul': 'tr', 'Europe/Moscow': 'ru', 'Europe/Kiev': 'ua',
};

function detectCountry() {
  try {
    // Try timezone-based detection first (most reliable)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_COUNTRY[tz]) {
      return TIMEZONE_TO_COUNTRY[tz];
    }
    // Fallback: extract region from browser locale (e.g., "en-PH" → "ph")
    const locale = navigator.language || navigator.userLanguage || '';
    const parts = locale.split('-');
    if (parts.length >= 2) {
      const region = parts[parts.length - 1].toLowerCase();
      if (COUNTRIES.some((c) => c.code === region)) {
        return region;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function CountryFlag({ code, className = '' }) {
  return <span className={`fi fi-${code} ${className}`} />;
}

export default function PhoneNumberInput({ value, onChange, defaultCountry = 'US', error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const [selected, setSelected] = useState(() => {
    const detected = detectCountry();
    if (detected) {
      const match = COUNTRIES.find((c) => c.code === detected);
      if (match) return match;
    }
    return COUNTRIES.find((c) => c.code === defaultCountry.toLowerCase()) || COUNTRIES[0];
  });

  // Extract the national number from the full value (strip the dial code)
  const nationalNumber = value
    ? value.startsWith(selected.dial)
      ? value.slice(selected.dial.length)
      : value.replace(/^\+\d+/, '')
    : '';

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query) return COUNTRIES;
    const q = query.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.includes(q)
    );
  }, [query]);

  function handleCountrySelect(country) {
    setSelected(country);
    setIsOpen(false);
    setQuery('');
    onChange(nationalNumber ? `${country.dial}${nationalNumber}` : '');
  }

  function handleNumberChange(e) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    onChange(raw ? `${selected.dial}${raw}` : '');
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        {/* Country selector */}
        <button
          type="button"
          className="input-field flex items-center gap-2 shrink-0 w-[110px] justify-center"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setQuery('');
          }}
        >
          <CountryFlag code={selected.code} className="text-lg" />
          <span className="text-text-secondary text-sm font-mono font-semibold">{selected.dial}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Phone number input */}
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="tel"
            className="input-field pl-10 w-full"
            placeholder="Phone number"
            value={nationalNumber}
            onChange={handleNumberChange}
          />
        </div>
      </div>

      {/* Country dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-surface-2 border border-border rounded-lg shadow-lg">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <input
              ref={searchRef}
              type="text"
              className="input-field w-full text-sm"
              placeholder="Search country..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
                if (e.key === 'Enter' && filtered.length > 0) {
                  e.preventDefault();
                  handleCountrySelect(filtered[0]);
                }
              }}
            />
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-text-muted font-mono">No countries found</div>
            ) : (
              filtered.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm font-mono flex items-center gap-2.5 ${
                    country.code === selected.code
                      ? 'bg-violet/10 text-text-primary'
                      : 'text-text-primary hover:bg-violet/10'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCountrySelect(country);
                  }}
                >
                  <CountryFlag code={country.code} className="text-base" />
                  <span className="flex-1">{country.name}</span>
                  <span className="text-text-muted">{country.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red font-mono">{error}</p>}
    </div>
  );
}
