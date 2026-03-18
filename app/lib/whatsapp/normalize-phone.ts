/**
 * Normalizes a phone number to the E.164-style format used by WhatsApp APIs
 * (digits only, with Brazil country code 55).
 *
 * Handles:
 *  - @s.whatsapp.net JID suffix (Evolution API)
 *  - Brazilian mobile (11 digits) and landline (10 digits) bare numbers
 *  - Already-complete 13-digit (+55 + DDD + 9 + number) numbers
 *  - 12-digit landline numbers starting with 55 (kept as-is)
 */
export function normalizePhone(raw: string): string {
  // Strip WhatsApp JID suffix
  const withoutJid = raw.split('@')[0];

  // Keep only digits
  const digits = withoutJid.replace(/\D/g, '');

  if (digits.length < 10) return '';

  // Already has country code 55
  if (digits.startsWith('55')) {
    // 13 digits: 55 + DDD + 9 + 8-digit → correct mobile
    // 12 digits: 55 + DDD + 8-digit → landline, do NOT add 9
    if (digits.length === 13 || digits.length === 12) return digits;
  }

  // 11 digits: DDD + 9 + 8-digit mobile
  if (digits.length === 11) return `55${digits}`;

  // 10 digits: DDD + 8-digit (landline or older format)
  if (digits.length === 10) return `55${digits}`;

  return '';
}
