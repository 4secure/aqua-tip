export const STAT_CARD_CONFIG = [
  { entity_type: 'IPv4-Addr', label: 'IP Addresses', color: 'red' },
  { entity_type: 'Domain-Name', label: 'Domains', color: 'violet' },
  { entity_type: 'Hostname', label: 'Hostnames', color: 'cyan' },
  { entity_type: 'X509-Certificate', label: 'Certificates', color: 'amber' },
  { entity_type: 'Email-Addr', label: 'Email', color: 'amber' },
  { entity_type: 'Cryptocurrency-Wallet', label: 'Crypto Wallet', color: 'green' },
  { entity_type: 'Url', label: 'URL', color: 'violet' },
];

export const TYPE_BADGE_COLORS = {
  'IPv4-Addr':        { bg: '#FF3B5C25', text: '#FF3B5C' },
  'IPv6-Addr':        { bg: '#FF3B5C25', text: '#FF3B5C' },
  'Domain-Name':      { bg: '#00E5FF25', text: '#00E5FF' },
  'Url':              { bg: '#7A44E425', text: '#7A44E4' },
  'Email-Addr':       { bg: '#FFB02025', text: '#FFB020' },
  'StixFile':         { bg: '#00C48C25', text: '#00C48C' },
  'Hostname':         { bg: '#9B6BF725', text: '#9B6BF7' },
  'X509-Certificate': { bg: '#FFB02025', text: '#FFB020' },
};

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
