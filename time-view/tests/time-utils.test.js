import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDate,
  formatDateTime,
  getLunarLeapMonth,
  gregorianToLunar,
  lunarToGregorian,
  parseDateTimeInput,
  timestampToDate,
} from "../src/time-utils.js";

test("converts an explicit UTC date time to Unix seconds and milliseconds", () => {
  const result = parseDateTimeInput("2000-01-01", "00:00:00", "utc");
  assert.equal(result.ok, true);
  assert.equal(result.seconds, 946684800);
  assert.equal(result.milliseconds, 946684800000);
});

test("rejects invalid calendar date fields", () => {
  const result = parseDateTimeInput("2025-02-30", "12:00:00", "utc");
  assert.equal(result.ok, false);
  assert.match(result.error, /无效/);
});

test("converts seconds and milliseconds timestamps", () => {
  const seconds = timestampToDate("1700000000", "auto");
  assert.equal(seconds.ok, true);
  assert.equal(seconds.unit, "seconds");
  assert.equal(seconds.iso, "2023-11-14T22:13:20.000Z");
  assert.equal(formatDateTime(seconds.date, "utc"), "2023-11-14 22:13:20");

  const milliseconds = timestampToDate("1700000000000", "auto");
  assert.equal(milliseconds.ok, true);
  assert.equal(milliseconds.unit, "milliseconds");
  assert.equal(milliseconds.iso, "2023-11-14T22:13:20.000Z");
});

test("rejects malformed and out-of-range timestamps", () => {
  assert.equal(timestampToDate("not-a-number").ok, false);
  assert.equal(timestampToDate("999999999999999999999").ok, false);
});

test("formats date and time by UTC", () => {
  const date = new Date("2024-02-10T12:34:56Z");
  assert.equal(formatDate(date, "utc"), "2024-02-10");
  assert.equal(formatDateTime(date, "utc"), "2024-02-10 12:34:56");
});

test("converts 2024 Spring Festival between Gregorian and lunar dates", () => {
  const lunar = gregorianToLunar("2024-02-10");
  assert.equal(lunar.ok, true);
  assert.equal(lunar.year, 2024);
  assert.equal(lunar.month, 1);
  assert.equal(lunar.day, 1);
  assert.equal(lunar.isLeap, false);
  assert.match(lunar.text, /正月初一/);
  assert.equal(lunar.zodiac, "龙");

  const solar = lunarToGregorian(2024, 1, 1, false);
  assert.equal(solar.ok, true);
  assert.equal(solar.text, "2024-02-10");
});

test("supports leap lunar months and validates them by year", () => {
  assert.equal(getLunarLeapMonth(2023), 2);
  const leap = lunarToGregorian(2023, 2, 1, true);
  assert.equal(leap.ok, true);
  assert.equal(leap.text, "2023-03-22");

  const invalidLeap = lunarToGregorian(2024, 2, 1, true);
  assert.equal(invalidLeap.ok, false);
  assert.match(invalidLeap.error, /没有闰月/);
});

test("validates lunar year, month and day ranges", () => {
  assert.equal(lunarToGregorian(1899, 1, 1).ok, false);
  assert.equal(lunarToGregorian(2024, 13, 1).ok, false);
  assert.equal(lunarToGregorian(2024, 1, 31).ok, false);
});
