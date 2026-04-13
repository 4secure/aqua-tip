import { useState, useEffect } from 'react';

const CONSENT_KEY = 'cookie_consent';
const GTM_ID = 'GTM-WN949DRD';

function injectGTM() {
  if (document.getElementById('gtm-script')) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'accepted') {
      injectGTM();
    } else if (consent === null) {
      setVisible(true);
    }
    // 'rejected' — do nothing, banner stays hidden, no GTM
  }, []);

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    injectGTM();
    setVisible(false);
  }

  function handleReject() {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-xl mx-auto bg-surface/80 border border-border backdrop-blur-md rounded-xl px-5 py-4 flex items-center gap-4 shadow-lg">
        <p className="text-sm text-text-secondary font-sans flex-1">
          We use cookies for analytics.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReject}
            className="px-4 py-1.5 text-sm font-sans text-text-muted hover:text-text-primary border border-border rounded-lg transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-1.5 text-sm font-sans text-white bg-violet hover:bg-violet/90 rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
