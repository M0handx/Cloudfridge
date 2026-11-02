import assert from 'node:assert/strict';
import { test } from 'node:test';
import { daysLeft, describeExpiry, todayIso, urgencyColor } from './urgency.js';

// Local time, late in the evening: the case where UTC parsing goes wrong.
const NOW = new Date(2026, 10, 2, 23, 30);

test('daysLeft counts whole calendar days', () => {
  assert.equal(daysLeft('2026-11-02', NOW), 0);
  assert.equal(daysLeft('2026-11-03', NOW), 1);
  assert.equal(daysLeft('2026-11-01', NOW), -1);
  assert.equal(daysLeft('2026-11-12', NOW), 10);
});

test('daysLeft crosses month and year ends', () => {
  assert.equal(daysLeft('2026-12-01', new Date(2026, 10, 30)), 1);
  assert.equal(daysLeft('2027-01-01', new Date(2026, 11, 31)), 1);
});

test('daysLeft handles a leap day', () => {
  assert.equal(daysLeft('2028-03-01', new Date(2028, 1, 28)), 2);
});

test('daysLeft is not affected by a daylight saving change', () => {
  assert.equal(daysLeft('2026-10-26', new Date(2026, 9, 24, 12)), 2);
  assert.equal(daysLeft('2027-03-29', new Date(2027, 2, 27, 12)), 2);
});

test('urgencyColor follows the guide\'s boundaries', () => {
  const cases = [
    [-5, 'grey'], [-1, 'grey'],
    [0, 'red'], [2, 'red'],
    [3, 'amber'], [7, 'amber'],
    [8, 'green'], [100, 'green'],
  ];
  for (const [days, color] of cases) assert.equal(urgencyColor(days), color, `${days} days`);
});

test('describeExpiry reads naturally', () => {
  assert.equal(describeExpiry(-3), 'Expired 3 days ago');
  assert.equal(describeExpiry(-1), 'Expired 1 day ago');
  assert.equal(describeExpiry(0), 'Expires today');
  assert.equal(describeExpiry(1), 'Expires in 1 day');
  assert.equal(describeExpiry(5), 'Expires in 5 days');
});

test('todayIso pads the month and day', () => {
  assert.equal(todayIso(new Date(2026, 0, 5)), '2026-01-05');
});
