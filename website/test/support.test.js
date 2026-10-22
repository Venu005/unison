import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import SITE from '../site.config.js';
import { applySupport, upiLink } from '../src/support.js';

const page = `<a href="#x">a</a><!-- support:start --><section id="support"><a href="%SPONSOR_URL%">s</a><!-- upi:start --><a href="%UPI_LINK%">%UPI_QR%<b>%UPI_ID%</b></a><!-- upi:end --></section><!-- support:end --><footer><!-- support:start --><a href="#support">Support</a><!-- support:end --></footer>`;
const on = { sponsorUrl: 'https://github.com/sponsors/Venu005', upiId: 'unison.dev@okicici' };

test('hides every support block while sponsorUrl is null', async () => {
  const html = await applySupport(page, { sponsorUrl: null, upiId: 'a@b' });
  expect(html).not.toContain('support');
  expect(html).not.toContain('%');
  expect(html).not.toContain('sponsors');
  expect(html).toContain('<a href="#x">a</a>');
});

test('keeps the section and fills the Sponsors link', async () => {
  const html = await applySupport(page, on);
  expect(html).toContain('id="support"');
  expect(html).toContain('href="https://github.com/sponsors/Venu005"');
  expect(html).toContain('href="#support"');
  expect(html).not.toContain('<!--');
});

test('hides only the UPI block while upiId is null', async () => {
  const html = await applySupport(page, { ...on, upiId: null });
  expect(html).toContain('id="support"');
  expect(html).not.toContain('upi:');
  expect(html).not.toContain('%UPI');
});

test('fills the UPI link, ID and an inline QR code', async () => {
  const html = await applySupport(page, on);
  expect(html).toContain('href="upi://pay?pa=unison.dev@okicici&amp;pn=Unison&amp;cu=INR"');
  expect(html).toContain('<b>unison.dev@okicici</b>');
  expect(html).toContain('<svg');
  expect(html).toContain('aria-label="UPI QR code for unison.dev@okicici"');
  expect(html).not.toContain('<?xml');
});

test('upiLink builds the UPI pay URI', () => {
  expect(upiLink('a.b@ybl')).toBe('upi://pay?pa=a.b@ybl&pn=Unison&cu=INR');
});

test('rejects a malformed UPI ID', async () => {
  await expect(applySupport(page, { ...on, upiId: 'name@' })).rejects.toThrow('is not a UPI ID');
  await expect(applySupport(page, { ...on, upiId: 'my name@okicici' })).rejects.toThrow('is not a UPI ID');
});

test('ships with Sponsors live and UPI off', () => {
  expect(SITE.sponsorUrl).toBe('https://github.com/sponsors/Venu005');
  expect(SITE.upiId).toBe(null);
});

test('the QR code has the standard 4-module quiet zone', async () => {
  const size = +(await applySupport(page, on)).match(/viewBox="0 0 (\d+) \1"/)[1];
  expect((size - 8 - 21) % 4).toBe(0);   // QR versions are 21 + 4k modules wide; 4 modules of margin each side
});

test('the UPI block is a link only on touch screens (desktop browsers can\'t open upi:)', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  expect(index).toContain('data-upi-href="%UPI_LINK%"');
  expect(index).not.toMatch(/\shref="%UPI_LINK%"/);
});
