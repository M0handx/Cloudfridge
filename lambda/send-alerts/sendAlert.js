import nodemailer from 'nodemailer';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

function dayDiff(todayIso, targetIso) {
  const [y1, m1, d1] = todayIso.split('-').map(Number);
  const [y2, m2, d2] = targetIso.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}

function formatItemLine(item, todayIso) {
  const days = dayDiff(todayIso, item.expiry_date);
  const dateLabel = formatShortDate(item.expiry_date);
  if (days <= 0) return `${item.name}: expires today (${dateLabel})`;
  if (days === 1) return `${item.name}: expires tomorrow (${dateLabel})`;
  return `${item.name}: expires in ${days} days (${dateLabel})`;
}

export function buildAlertMessage(items, todayIso) {
  const count = items.length;
  const subject = `CloudFridge: ${count} ${count === 1 ? 'item' : 'items'} expiring soon`;
  const text = items.map((item) => formatItemLine(item, todayIso)).join('\n');
  return { subject, text };
}

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'email-smtp.eu-west-1.amazonaws.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

export async function sendAlert(user, items, todayIso) {
  const { subject, text } = buildAlertMessage(items, todayIso);
  const from = process.env.SMTP_FROM;
  if (!from || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Missing required SMTP environment variables (SMTP_FROM, SMTP_USER, SMTP_PASS)');
  }

  await getTransporter().sendMail({
    from,
    to: user.email,
    subject,
    text,
  });
}

