const DAY_MS = 86_400_000;

// Whole days from today to a 'YYYY-MM-DD' date, negative once expired.
// Works from the date parts, because new Date('2026-11-05') is read as UTC and
// can land on the previous day. UTC arithmetic also keeps daylight saving out of it.
export function daysLeft(expiryDate, now = new Date()) {
  const [year, month, day] = expiryDate.split('-').map(Number);
  const expiry = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expiry - today) / DAY_MS);
}

export function urgencyColor(days) {
  if (days < 0) return 'grey';
  if (days <= 2) return 'red';
  if (days <= 7) return 'amber';
  return 'green';
}

export function describeExpiry(days) {
  if (days < -1) return `Expired ${-days} days ago`;
  if (days === -1) return 'Expired 1 day ago';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires in 1 day';
  return `Expires in ${days} days`;
}

// Today's date as 'YYYY-MM-DD' in the browser's time zone.
export function todayIso(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
