// All mock data — frozen objects for immutability

export const IP_REPORT = Object.freeze({
  ip: '185.220.101.34',
  score: 87,
  verdict: 'Malicious',
  country: 'Russia',
  countryCode: 'RU',
  city: 'Moscow',
  asn: 'AS47541',
  org: 'VPS Hosting Co.',
  isp: 'Veli Net',
  classifications: ['C2 Server', 'Botnet Node', 'Scanner'],
  firstSeen: '2024-08-12',
  lastSeen: '2026-03-11',
  totalReports: 1847,
  blocklists: [
    { name: 'Spamhaus DROP', listed: true },
    { name: 'AbuseIPDB', listed: true, reports: 342 },
    { name: 'AlienVault OTX', listed: true, pulses: 28 },
    { name: 'Blocklist.de', listed: true },
    { name: 'CINS Score', listed: false },
    { name: 'Talos Intelligence', listed: true },
  ],
  ports: [22, 80, 443, 4444, 8080, 8443],
  activity: [
    { date: '2026-03-11', type: 'C2 Communication', target: '10.0.0.0/8', count: 145 },
    { date: '2026-03-10', type: 'Port Scan', target: '192.168.0.0/16', count: 2340 },
    { date: '2026-03-09', type: 'Brute Force SSH', target: 'Multiple', count: 890 },
    { date: '2026-03-08', type: 'Malware Distribution', target: 'HTTP', count: 56 },
  ],
});

export const FEEDS = Object.freeze([
  { id: 1, name: 'AlienVault OTX', type: 'STIX/TAXII', status: 'active', indicators: 45200, updated: '2m ago', premium: false, category: 'Community' },
  { id: 2, name: 'Recorded Future', type: 'REST API', status: 'active', indicators: 128400, updated: '5m ago', premium: true, category: 'Commercial' },
  { id: 3, name: 'VirusTotal', type: 'REST API', status: 'active', indicators: 89300, updated: '1m ago', premium: true, category: 'Commercial' },
  { id: 4, name: 'AbuseIPDB', type: 'REST API', status: 'active', indicators: 34100, updated: '10m ago', premium: false, category: 'Community' },
  { id: 5, name: 'PhishTank', type: 'CSV Feed', status: 'active', indicators: 12800, updated: '15m ago', premium: false, category: 'Open Source' },
  { id: 6, name: 'Spamhaus', type: 'DNS/REST', status: 'paused', indicators: 67500, updated: '2h ago', premium: true, category: 'Commercial' },
  { id: 7, name: 'MISP Community', type: 'MISP JSON', status: 'active', indicators: 23400, updated: '30m ago', premium: false, category: 'Community' },
  { id: 8, name: 'Shodan', type: 'REST API', status: 'error', indicators: 0, updated: 'Error', premium: true, category: 'Commercial' },
  { id: 9, name: 'URLhaus', type: 'CSV Feed', status: 'active', indicators: 18900, updated: '8m ago', premium: false, category: 'Open Source' },
  { id: 10, name: 'CrowdStrike Falcon', type: 'REST API', status: 'inactive', indicators: 0, updated: 'N/A', premium: true, category: 'Commercial' },
]);

export const VULNS = Object.freeze([
  { id: 'CVE-2021-44228', name: 'Log4Shell', severity: 'critical', cvss: 10.0, epss: 0.974, product: 'Apache Log4j', status: 'exploited' },
  { id: 'CVE-2024-3094', name: 'XZ Backdoor', severity: 'critical', cvss: 10.0, epss: 0.891, product: 'XZ Utils', status: 'exploited' },
  { id: 'CVE-2023-44487', name: 'HTTP/2 Rapid Reset', severity: 'high', cvss: 7.5, epss: 0.823, product: 'Multiple', status: 'exploited' },
  { id: 'CVE-2025-21298', name: 'Windows OLE RCE', severity: 'critical', cvss: 9.8, epss: 0.456, product: 'Microsoft Windows', status: 'patched' },
  { id: 'CVE-2025-0282', name: 'Ivanti Connect Secure', severity: 'critical', cvss: 9.0, epss: 0.678, product: 'Ivanti', status: 'exploited' },
  { id: 'CVE-2024-50623', name: 'Cleo File Transfer', severity: 'high', cvss: 8.8, epss: 0.542, product: 'Cleo Harmony', status: 'patched' },
]);

export const DOMAIN_REPORT = Object.freeze({
  domain: 'example.com',
  score: 12,
  verdict: 'Clean',
  registrar: 'ICANN',
  created: '1995-08-14',
  expires: '2027-08-13',
  nameservers: ['a.iana-servers.net', 'b.iana-servers.net'],
  dnsRecords: [
    { type: 'A', name: 'example.com', value: '93.184.216.34', ttl: 3600 },
    { type: 'AAAA', name: 'example.com', value: '2606:2800:220:1:248:1893:25c8:1946', ttl: 3600 },
    { type: 'MX', name: 'example.com', value: 'mail.example.com', ttl: 3600 },
    { type: 'NS', name: 'example.com', value: 'a.iana-servers.net', ttl: 3600 },
    { type: 'TXT', name: 'example.com', value: 'v=spf1 -all', ttl: 3600 },
  ],
  ssl: {
    issuer: "DigiCert Inc",
    subject: 'example.com',
    validFrom: '2024-01-30',
    validTo: '2025-03-01',
    protocol: 'TLSv1.3',
    grade: 'A+',
  },
  whois: {
    registrant: 'REDACTED FOR PRIVACY',
    org: 'Internet Assigned Numbers Authority',
    country: 'US',
    state: 'California',
  },
  subdomains: ['www.example.com', 'mail.example.com', 'dev.example.com', 'staging.example.com'],
});

export const CVE_DETAIL = Object.freeze({
  id: 'CVE-2021-44228',
  name: 'Log4Shell',
  severity: 'critical',
  cvss: 10.0,
  epss: 0.974,
  vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
  published: '2021-12-10',
  modified: '2026-02-15',
  cwe: 'CWE-502: Deserialization of Untrusted Data',
  description: 'Apache Log4j2 2.0-beta9 through 2.15.0 (excluding security releases 2.12.2, 2.12.3, and 2.3.1) JNDI features used in configuration, log messages, and parameters do not protect against attacker controlled LDAP and other JNDI related endpoints.',
  affectedProducts: [
    { vendor: 'Apache', product: 'Log4j', versions: '2.0-beta9 to 2.14.1' },
    { vendor: 'VMware', product: 'vCenter Server', versions: '6.5, 6.7, 7.0' },
    { vendor: 'Cisco', product: 'Multiple Products', versions: 'Various' },
    { vendor: 'Oracle', product: 'WebLogic Server', versions: '12.x, 14.x' },
  ],
  patches: [
    { vendor: 'Apache', version: '2.17.0', date: '2021-12-17', url: '#' },
    { vendor: 'Apache', version: '2.12.3', date: '2021-12-14', url: '#' },
  ],
  exploits: [
    { source: 'Exploit-DB', id: '51183', type: 'Remote', verified: true },
    { source: 'GitHub', id: 'kozmer/log4j-shell-poc', type: 'PoC', verified: true },
  ],
  timeline: [
    { date: '2021-11-24', event: 'Vulnerability reported to Apache' },
    { date: '2021-12-09', event: 'Public disclosure' },
    { date: '2021-12-10', event: 'CVE assigned' },
    { date: '2021-12-11', event: 'Active exploitation observed' },
    { date: '2021-12-14', event: 'Log4j 2.16.0 released' },
    { date: '2021-12-17', event: 'Log4j 2.17.0 released (final fix)' },
  ],
  references: [
    { title: 'Apache Log4j Security Advisory', url: '#' },
    { title: 'CISA Alert AA21-356A', url: '#' },
    { title: 'NIST NVD Entry', url: '#' },
  ],
});

export const API_KEYS = Object.freeze([
  { id: 1, name: 'Production API Key', key: 'ask_live_••••••••••••7f3a', scopes: ['read', 'write', 'feeds'], created: '2025-12-01', lastUsed: '2026-03-11', status: 'active' },
  { id: 2, name: 'Development Key', key: 'ask_test_••••••••••••9b2c', scopes: ['read'], created: '2026-01-15', lastUsed: '2026-03-10', status: 'active' },
  { id: 3, name: 'CI/CD Pipeline', key: 'ask_ci_••••••••••••4d8e', scopes: ['read', 'feeds'], created: '2026-02-20', lastUsed: '2026-03-11', status: 'active' },
  { id: 4, name: 'Legacy Key (deprecated)', key: 'ask_old_••••••••••••1a5f', scopes: ['read'], created: '2024-06-10', lastUsed: '2025-08-22', status: 'revoked' },
]);

export const NAV_CATEGORIES = Object.freeze([
  {
    label: 'Overview',
    items: [
      { label: 'Threat Map', icon: 'map', href: '/threat-map', public: false, gated: true },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Threat Search', icon: 'search', href: '/threat-search', public: true, gated: false },
      { label: 'Threat Actors', icon: 'users', href: '/threat-actors', public: false, gated: true },
      { label: 'Threat News', icon: 'rss', href: '/threat-news', public: false, gated: true },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Dark Web', icon: 'incognito', href: '/dark-web', public: false, gated: true },
    ],
  },
]);

export const NAV_ITEMS = Object.freeze(NAV_CATEGORIES.flatMap(c => c.items));

export const IP_RELATIONS = Object.freeze([
  { source: '185.220.101.34', target: 'malware-c2.evil.ru', type: 'resolves_to' },
  { source: 'malware-c2.evil.ru', target: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', type: 'serves' },
  { source: '185.220.101.34', target: '103.224.182.251', type: 'communicates_with' },
  { source: '103.224.182.251', target: 'api-update.download', type: 'resolves_to' },
  { source: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', type: 'hash', label: 'SHA256' },
  { source: 'api-update.download', target: 'f7a8b9c0d1e2f7a8b9c0d1e2f7a8b9c0', type: 'distributes' },
  { source: '185.220.101.34', target: 'APT-29', type: 'attributed_to' },
  { source: 'malware-c2.evil.ru', target: 'APT-29', type: 'attributed_to' },
]);
