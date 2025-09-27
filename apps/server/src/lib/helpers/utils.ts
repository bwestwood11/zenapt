/**
 * Masks an email.
 * Example:
 *   "diwanshu@example.com" -> "d*****u@example.com"
 *   "a@b.com" -> "a*@b.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email; // not a valid email, return as-is

  if (local.length <= 2) {
    // short local-part, mask everything except first character
    return local[0] + "*@" + domain;
  }

  const first = local[0];
  const last = local[local.length - 1];
  const maskedMiddle = "*".repeat(local.length - 2);

  return `${first}${maskedMiddle}${last}@${domain}`;
}


export function toSeconds(options: {
  days?: number
  hours?: number
  minutes?: number
  seconds?: number
  milliseconds?: number
}): number {
  const {
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
    milliseconds = 0,
  } = options

  return (
    days * 86400 + // 24 * 3600
    hours * 3600 +
    minutes * 60 +
    seconds +
    milliseconds / 1000
  )
}
