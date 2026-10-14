export const APPROVED_DOMAINS = [
  'developer.mozilla.org',
  'geeksforgeeks.org',
  'ocw.mit.edu',
  'en.wikipedia.org',
  'youtube.com',
  'youtu.be',
  'khanacademy.org',
  'cs50.harvard.edu',
  'visualgo.net',
  'docs.python.org',
  'w3schools.com',
  'refactoring.guru',
  'wiki.osdev.org',
  'datatracker.ietf.org',
  'postgresql.org',
  'db.cs.cmu.edu',
  'cs144.github.io'
];

/**
 * Validates whether a given URL is valid, uses HTTPS, and resolves to an approved domain or subdomain.
 * Defends against look-alikes like "geeksforgeeks.org.evil.com"
 */
export function isApprovedDomain(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    return APPROVED_DOMAINS.some((allowed) => {
      const allowedLower = allowed.toLowerCase();
      return host === allowedLower || host.endsWith('.' + allowedLower);
    });
  } catch {
    return false;
  }
}
