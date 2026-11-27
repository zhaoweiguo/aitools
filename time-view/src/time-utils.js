import lunarPkg from "lunar-javascript";

const { Solar, Lunar, LunarYear } = lunarPkg;

export const LUNAR_MIN_YEAR = 1900;
export const LUNAR_MAX_YEAR = 2100;

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const LUNAR_MONTHS = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

function zonedParts(date, zone = "local") {
  const utc = zone === "utc";
  return {
    year: utc ? date.getUTCFullYear() : date.getFullYear(),
    month: (utc ? date.getUTCMonth() : date.getMonth()) + 1,
    day: utc ? date.getUTCDate() : date.getDate(),
    hour: utc ? date.getUTCHours() : date.getHours(),
    minute: utc ? date.getUTCMinutes() : date.getMinutes(),
    second: utc ? date.getUTCSeconds() : date.getSeconds(),
    millisecond: utc ? date.getUTCMilliseconds() : date.getMilliseconds(),
  };
}

export function timezoneName(zone = "local") {
  if (zone === "utc") return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  } catch {
    return "Local";
  }
}

export function formatDateTime(dateValue, zone = "local") {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  const p = zonedParts(date, zone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

export function formatDate(dateValue, zone = "local") {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  const p = zonedParts(date, zone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function formatWeekday(dateValue, zone = "local") {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return WEEKDAYS[zone === "utc" ? date.getUTCDay() : date.getDay()];
}

export function dateInputValue(dateValue, zone = "local") {
  return formatDate(dateValue, zone);
}

export function timeInputValue(dateValue, zone = "local") {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const p = zonedParts(date, zone);
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

export function parseDateTimeInput(dateText, timeText, zone = "local") {
  const dateMatch = String(dateText || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(timeText || "00:00:00").match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!dateMatch || !timeMatch) {
    return { ok: false, error: "请输入完整的年月日和时分秒。" };
  }

  const [, year, month, day] = dateMatch.map(Number);
  const [, hour, minute, second = 0] = timeMatch.map(Number);
  const date =
    zone === "utc"
      ? new Date(Date.UTC(year, month - 1, day, hour, minute, second))
      : new Date(year, month - 1, day, hour, minute, second);
  const p = zonedParts(date, zone);

  if (
    p.year !== year ||
    p.month !== month ||
    p.day !== day ||
    p.hour !== hour ||
    p.minute !== minute ||
    p.second !== second
  ) {
    return { ok: false, error: "日期或时间无效，请检查数值范围。" };
  }

  return {
    ok: true,
    date,
    milliseconds: date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    error: null,
  };
}

export function timestampToDate(input, unit = "auto") {
  const text = String(input ?? "").trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) {
    return { ok: false, error: "请输入数字时间戳。", unit: null };
  }

  const numeric = Number(text);
  if (!Number.isFinite(numeric)) {
    return { ok: false, error: "时间戳超出可处理范围。", unit: null };
  }

  const resolvedUnit =
    unit === "auto" ? (Math.abs(numeric) >= 100_000_000_000 ? "milliseconds" : "seconds") : unit;
  const milliseconds = resolvedUnit === "milliseconds" ? numeric : numeric * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "时间戳超出可处理范围。", unit: resolvedUnit };
  }

  return {
    ok: true,
    date,
    milliseconds,
    seconds: Math.floor(milliseconds / 1000),
    unit: resolvedUnit,
    local: formatDateTime(date, "local"),
    utc: formatDateTime(date, "utc"),
    iso: date.toISOString(),
    weekday: formatWeekday(date, "local"),
    error: null,
  };
}

export function gregorianToLunar(dateText) {
  const match = String(dateText || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { ok: false, error: "请选择有效的公历日期。" };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR) {
    return { ok: false, error: `农历转换支持 ${LUNAR_MIN_YEAR}–${LUNAR_MAX_YEAR} 年。` };
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return { ok: false, error: "公历日期无效。" };
  }

  const solar = Solar.fromYmdHms(year, month, day, 0, 0, 0);
  const lunar = solar.getLunar();
  const lunarMonth = lunar.getMonth();
  return {
    ok: true,
    solarDate: `${year}-${pad(month)}-${pad(day)}`,
    year: lunar.getYear(),
    month: Math.abs(lunarMonth),
    day: lunar.getDay(),
    isLeap: lunarMonth < 0,
    monthName: lunar.getMonthInChinese(),
    dayName: lunar.getDayInChinese(),
    yearChinese: lunar.getYearInChinese(),
    ganzhi: lunar.getYearInGanZhi(),
    zodiac: lunar.getYearShengXiao(),
    text: `${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    error: null,
  };
}

export function getLunarLeapMonth(year) {
  try {
    return LunarYear.fromYear(Number(year)).getLeapMonth();
  } catch {
    return 0;
  }
}

export function lunarMonthLabel(month, leap = false) {
  return `${leap ? "闰" : ""}${LUNAR_MONTHS[Number(month) - 1] || month}`;
}

export function lunarToGregorian(year, month, day, isLeap = false) {
  const lunarYear = Number(year);
  const lunarMonth = Number(month);
  const lunarDay = Number(day);
  if (
    !Number.isInteger(lunarYear) ||
    lunarYear < LUNAR_MIN_YEAR ||
    lunarYear > LUNAR_MAX_YEAR
  ) {
    return { ok: false, error: `农历转换支持 ${LUNAR_MIN_YEAR}–${LUNAR_MAX_YEAR} 年。` };
  }
  if (!Number.isInteger(lunarMonth) || lunarMonth < 1 || lunarMonth > 12) {
    return { ok: false, error: "农历月份应在 1–12 之间。" };
  }

  const yearInfo = LunarYear.fromYear(lunarYear);
  const leapMonth = yearInfo.getLeapMonth();
  if (isLeap && leapMonth !== lunarMonth) {
    return {
      ok: false,
      error: leapMonth
        ? `农历 ${lunarYear} 年的闰月是闰${LUNAR_MONTHS[leapMonth - 1]}。`
        : `农历 ${lunarYear} 年没有闰月。`,
    };
  }

  const monthKey = isLeap ? -lunarMonth : lunarMonth;
  const monthInfo = yearInfo.getMonth(monthKey);
  if (!monthInfo) {
    return { ok: false, error: "所选农历月份不存在。" };
  }
  if (!Number.isInteger(lunarDay) || lunarDay < 1 || lunarDay > monthInfo.getDayCount()) {
    return {
      ok: false,
      error: `所选农历月份有 ${monthInfo.getDayCount()} 天。`,
    };
  }

  const solar = Lunar.fromYmd(lunarYear, monthKey, lunarDay).getSolar();
  const solarYear = solar.getYear();
  const solarMonth = solar.getMonth();
  const solarDay = solar.getDay();
  return {
    ok: true,
    year: solarYear,
    month: solarMonth,
    day: solarDay,
    text: `${solarYear}-${pad(solarMonth)}-${pad(solarDay)}`,
    weekday: WEEKDAYS[new Date(solarYear, solarMonth - 1, solarDay).getDay()],
    lunarText: `${lunarYear}年 ${lunarMonthLabel(lunarMonth, isLeap)}${LUNAR_DAYS[lunarDay - 1]}`,
    error: null,
  };
}

export const LUNAR_MONTH_OPTIONS = LUNAR_MONTHS.map((label, index) => ({
  value: index + 1,
  label,
}));

const LUNAR_DAYS = [
  "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
];

export const LUNAR_DAY_OPTIONS = LUNAR_DAYS.map((label, index) => ({
  value: index + 1,
  label,
}));
