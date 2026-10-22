// The "Support Unison" section (Plan 13), resolved at build time: the section exists only once GitHub Sponsors is
// live (`sponsorUrl`), and the UPI block only once there is a UPI ID. Hidden blocks are cut out of the HTML, so neither
// visitors nor crawlers see a dead link.
import QRCode from 'qrcode';

const UPI_ID = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,63}$/;

/** The UPI "pay" link that phone UPI apps (and the QR code) open. The ID stays raw: UPI apps expect a literal "@". */
export const upiLink = id => `upi://pay?pa=${id}&pn=Unison&cu=INR`;

const block = name => new RegExp(`<!-- ${name}:start -->([\\s\\S]*?)<!-- ${name}:end -->`, 'g');
const keep = (html, name, on) => html.replace(block(name), (_, inner) => (on ? inner : ''));

/** Keeps or cuts the support and UPI blocks between their marker comments, then fills their placeholders. */
export async function applySupport(html, site) {
  const sponsor = !!site.sponsorUrl, upi = sponsor && !!site.upiId;
  if (upi && !UPI_ID.test(site.upiId)) throw new Error(`upiId "${site.upiId}" is not a UPI ID (name@bank)`);
  let out = keep(keep(html, 'upi', upi), 'support', sponsor);
  if (!sponsor) return out;
  out = out.replaceAll('%SPONSOR_URL%', site.sponsorUrl);
  if (!upi) return out;
  const svg = (await QRCode.toString(upiLink(site.upiId), { type: 'svg', margin: 1, color: { dark: '#08090b', light: '#eef0f2' } }))
    .replace(/<\?xml[^>]*\?>\s*/, '')
    .replace('<svg', `<svg role="img" aria-label="UPI QR code for ${site.upiId}"`);
  return out
    .replaceAll('%UPI_ID%', site.upiId)
    .replaceAll('%UPI_LINK%', upiLink(site.upiId).replaceAll('&', '&amp;'))
    .replaceAll('%UPI_QR%', svg);
}
