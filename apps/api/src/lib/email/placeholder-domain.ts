// RFC 2606 reserved TLDs and common placeholder domains used in tests.
// Sending to these produces hard bounces that damage Resend sender reputation.
const PLACEHOLDER_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "example.edu",
  "test.com",
  "localhost",
  "invalid",
]);

const PLACEHOLDER_TLDS = new Set(["test", "example", "invalid", "localhost"]);

export function isPlaceholderEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  if (PLACEHOLDER_DOMAINS.has(domain)) return true;
  const tld = domain.split(".").pop();
  return tld ? PLACEHOLDER_TLDS.has(tld) : false;
}
