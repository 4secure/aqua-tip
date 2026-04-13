# DNS Records for Email Authentication

Configuration for preventing email spoofing on AQUA TIP platform.

## Overview

| Property | Value |
|----------|-------|
| Sending domain | aquasecure.io |
| From address | info@aquasecure.io |
| SMTP server | vmi2451737.contaboserver.net |
| Frontend | tip.aquasecure.ai |
| Backend | api.tip.aquasecure.ai |

## Required DNS Records

All records below are added to the **aquasecure.io** zone (the domain in MAIL_FROM_ADDRESS).

### 1. SPF (Sender Policy Framework)

Authorizes the Contabo SMTP server to send mail on behalf of aquasecure.io.

| Field | Value |
|-------|-------|
| Type | TXT |
| Name | `@` (or `aquasecure.io`) |
| Value | `v=spf1 a mx ip4:<CONTABO_SERVER_IP> include:contaboserver.net -all` |
| TTL | 3600 |

Replace `<CONTABO_SERVER_IP>` with the resolved IP of `vmi2451737.contaboserver.net`.

To find the IP:
```bash
dig +short vmi2451737.contaboserver.net
```

**Example** (replace IP with actual value):
```
v=spf1 a mx ip4:62.171.xxx.xxx include:contaboserver.net -all
```

**Explanation:**
- `a` -- allow the domain's own A record IP to send
- `mx` -- allow the domain's MX record hosts to send
- `ip4:<IP>` -- explicitly allow the Contabo server IP
- `include:contaboserver.net` -- allow Contabo's mail infrastructure
- `-all` -- reject all other senders (hard fail)

### 2. DKIM (DomainKeys Identified Mail)

DKIM requires generating a key pair on the Contabo mail server. If Contabo provides DKIM signing:

| Field | Value |
|-------|-------|
| Type | TXT |
| Name | `default._domainkey` (or selector provided by Contabo) |
| Value | `v=DKIM1; k=rsa; p=<PUBLIC_KEY>` |
| TTL | 3600 |

**To obtain the DKIM public key:**
1. SSH into the Contabo server (`vmi2451737.contaboserver.net`)
2. Check if DKIM is configured: `ls /etc/opendkim/keys/aquasecure.io/`
3. If a key exists, get the public key: `cat /etc/opendkim/keys/aquasecure.io/default.txt`
4. If no key exists, generate one:
   ```bash
   opendkim-genkey -s default -d aquasecure.io -D /etc/opendkim/keys/aquasecure.io/
   cat /etc/opendkim/keys/aquasecure.io/default.txt
   ```
5. Add the TXT record output to DNS

**If Contabo does not support DKIM signing**, skip this record and rely on SPF + DMARC.

### 3. DMARC (Domain-based Message Authentication, Reporting & Conformance)

Tells receiving mail servers how to handle messages that fail SPF/DKIM checks.

| Field | Value |
|-------|-------|
| Type | TXT |
| Name | `_dmarc` (or `_dmarc.aquasecure.io`) |
| Value | `v=DMARC1; p=quarantine; rua=mailto:dmarc@aquasecure.io; pct=100; adkim=r; aspf=r` |
| TTL | 3600 |

**Explanation:**
- `p=quarantine` -- quarantine (spam-folder) messages that fail authentication
- `rua=mailto:dmarc@aquasecure.io` -- send aggregate reports to this address
- `pct=100` -- apply policy to 100% of messages
- `adkim=r` -- relaxed DKIM alignment (allows subdomain signing)
- `aspf=r` -- relaxed SPF alignment

**Recommended rollout:**
1. Start with `p=none` to monitor without blocking
2. After 2 weeks of clean reports, switch to `p=quarantine`
3. After 4 weeks, optionally switch to `p=reject` for maximum protection

## Records for tip.aquasecure.ai and api.tip.aquasecure.ai

These subdomains do NOT send email. Add null SPF records to prevent spoofing from them:

| Domain | Type | Name | Value |
|--------|------|------|-------|
| tip.aquasecure.ai | TXT | `tip` (in aquasecure.ai zone) | `v=spf1 -all` |
| api.tip.aquasecure.ai | TXT | `api.tip` (in aquasecure.ai zone) | `v=spf1 -all` |

These hard-fail SPF records tell receivers that NO server is authorized to send mail from these subdomains.

## Verification

After adding records, verify with:

```bash
# Check SPF
dig TXT aquasecure.io +short

# Check DKIM (replace 'default' with your selector)
dig TXT default._domainkey.aquasecure.io +short

# Check DMARC
dig TXT _dmarc.aquasecure.io +short
```

Online tools:
- https://mxtoolbox.com/spf.aspx
- https://mxtoolbox.com/dkim.aspx
- https://mxtoolbox.com/dmarc.aspx

## Notes

- The MAIL_FROM_ADDRESS is `info@aquasecure.io` but the platform runs on `*.aquasecure.ai`. These are different domains. SPF/DKIM/DMARC records go on the **sending** domain (`aquasecure.io`).
- The null SPF records on `tip.aquasecure.ai` and `api.tip.aquasecure.ai` are defensive -- they prevent attackers from spoofing emails that appear to come from the platform's web domains.
- DKIM setup depends on the Contabo server's mail daemon configuration. If using Postfix, ensure `opendkim` is installed and configured to sign outbound mail.
