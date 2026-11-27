import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Hourglass,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  dateInputValue,
  formatDate,
  formatDateTime,
  formatWeekday,
  getLunarLeapMonth,
  gregorianToLunar,
  LUNAR_DAY_OPTIONS,
  LUNAR_MAX_YEAR,
  LUNAR_MIN_YEAR,
  LUNAR_MONTH_OPTIONS,
  lunarMonthLabel,
  lunarToGregorian,
  parseDateTimeInput,
  timeInputValue,
  timestampToDate,
  timezoneName,
} from "./time-utils.js";

function CopyButton({ value, copyKey, copiedKey, onCopy, label = "复制" }) {
  return (
    <button
      type="button"
      className="time-copy-button"
      onClick={() => onCopy(String(value), copyKey)}
      title={label}
    >
      {copiedKey === copyKey ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="time-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function initialLunar() {
  const result = gregorianToLunar(dateInputValue(new Date()));
  if (!result.ok) {
    const year = new Date().getFullYear();
    return { year, month: 1, day: 1, leap: false };
  }
  return { year: result.year, month: result.month, day: result.day, leap: result.isLeap };
}

export default function TimeView() {
  const [now, setNow] = useState(() => new Date());
  const [zone, setZone] = useState("local");
  const [dateValue, setDateValue] = useState(() => dateInputValue(new Date()));
  const [timeValue, setTimeValue] = useState(() => timeInputValue(new Date()));
  const [timestampInput, setTimestampInput] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [timestampUnit, setTimestampUnit] = useState("auto");
  const [calendarMode, setCalendarMode] = useState("solar-to-lunar");
  const [solarDate, setSolarDate] = useState(() => dateInputValue(new Date()));
  const [lunarDate, setLunarDate] = useState(initialLunar);
  const [copiedKey, setCopiedKey] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!copiedKey) return undefined;
    const timer = window.setTimeout(() => setCopiedKey(""), 1400);
    return () => window.clearTimeout(timer);
  }, [copiedKey]);

  async function copyValue(value, key) {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
    } catch {
      setCopiedKey("");
    }
  }

  const currentLocal = formatDateTime(now, "local");
  const currentUtc = formatDateTime(now, "utc");
  const currentDate = formatDate(now, "local");
  const currentSeconds = Math.floor(now.getTime() / 1000);
  const currentMilliseconds = now.getTime();
  const currentLunar = useMemo(() => gregorianToLunar(currentDate), [currentDate]);
  const localZone = timezoneName("local");

  const dateToTimestamp = useMemo(
    () => parseDateTimeInput(dateValue, timeValue, zone),
    [dateValue, timeValue, zone],
  );
  const timestampResult = useMemo(
    () => timestampToDate(timestampInput, timestampUnit),
    [timestampInput, timestampUnit],
  );

  const solarResult = useMemo(() => gregorianToLunar(solarDate), [solarDate]);
  const lunarResult = useMemo(
    () => lunarToGregorian(lunarDate.year, lunarDate.month, lunarDate.day, lunarDate.leap),
    [lunarDate],
  );
  const leapMonth = useMemo(() => getLunarLeapMonth(lunarDate.year), [lunarDate.year]);

  function useCurrentTimeForDate() {
    const current = new Date();
    setDateValue(dateInputValue(current, zone));
    setTimeValue(timeInputValue(current, zone));
  }

  function useCurrentTimestamp() {
    setTimestampInput(String(Math.floor(Date.now() / 1000)));
    setTimestampUnit("auto");
  }

  function syncLunarFromSolar() {
    const result = gregorianToLunar(solarDate);
    if (!result.ok) return;
    setLunarDate({
      year: result.year,
      month: result.month,
      day: result.day,
      leap: result.isLeap,
    });
  }

  return (
    <div className="time-shell">
      <header className="time-header">
        <div className="time-header-left">
          <a className="time-brand" href="/" aria-label="返回工具首页">
            <span className="time-brand-mark"><Clock3 size={17} /></span>
            <span>
              <strong>Time View</strong>
              <small>Timestamp & calendar</small>
            </span>
          </a>
          <span className="time-header-separator" />
          <a className="time-back-link" href="/">
            <ArrowLeft size={14} />
            所有工具
          </a>
        </div>
        <div className="time-header-actions">
          <span className="time-local-badge"><LockKeyhole size={13} />本地计算</span>
          <span className="time-zone-chip">{localZone}</span>
        </div>
      </header>

      <main className="time-main">
        <div className="time-title-row">
          <div>
            <span className="time-eyebrow">TIME / UTILITY 04</span>
            <h1>时间与农历换算</h1>
            <p>Unix 时间戳、日期时间与公历农历双向转换。</p>
          </div>
          <div className="time-title-meta">
            <span className="live-dot" />
            每秒更新
          </div>
        </div>

        <section className="time-now-panel">
          <div className="now-clock-block">
            <span className="time-section-label">CURRENT TIME</span>
            <div className="now-date">{currentDate}</div>
            <div className="now-clock">{currentLocal.slice(11)}</div>
            <div className="now-subline">
              <span>{formatWeekday(now)}</span>
              <i />
              <span>{localZone}</span>
              <i />
              <span>{currentUtc.slice(11)} UTC</span>
            </div>
          </div>
          <div className="now-values">
            <div className="now-value-row">
              <span><small>UNIX SECONDS</small><code>{currentSeconds}</code></span>
              <CopyButton
                value={currentSeconds}
                copyKey="now-seconds"
                copiedKey={copiedKey}
                onCopy={copyValue}
                label="复制秒级时间戳"
              />
            </div>
            <div className="now-value-row">
              <span><small>UNIX MILLISECONDS</small><code>{currentMilliseconds}</code></span>
              <CopyButton
                value={currentMilliseconds}
                copyKey="now-ms"
                copiedKey={copiedKey}
                onCopy={copyValue}
                label="复制毫秒时间戳"
              />
            </div>
            <div className="now-value-row">
              <span><small>ISO 8601 · UTC</small><code>{now.toISOString()}</code></span>
              <CopyButton
                value={now.toISOString()}
                copyKey="now-iso"
                copiedKey={copiedKey}
                onCopy={copyValue}
                label="复制 ISO 时间"
              />
            </div>
          </div>
          {currentLunar.ok && (
            <div className="now-lunar">
              <CalendarDays size={15} />
              <span>{currentLunar.text}</span>
              <small>属{currentLunar.zodiac} · {currentLunar.ganzhi}年</small>
            </div>
          )}
        </section>

        <div className="time-converter-grid">
          <section className="time-panel">
            <div className="time-panel-heading">
              <div>
                <span className="time-section-label">DATE → UNIX</span>
                <h2>年月日时分秒 → 时间戳</h2>
              </div>
              <button type="button" className="time-text-button" onClick={useCurrentTimeForDate}>
                <RefreshCw size={13} />
                此刻
              </button>
            </div>

            <div className="timestamp-zone-switch" role="group" aria-label="日期时区">
              <button type="button" className={zone === "local" ? "active" : ""} onClick={() => setZone("local")}>
                本地 · {localZone}
              </button>
              <button type="button" className={zone === "utc" ? "active" : ""} onClick={() => setZone("utc")}>
                UTC
              </button>
            </div>

            <div className="time-input-grid">
              <Field label="年月日">
                <input
                  type="date"
                  min="1900-01-01"
                  max="2100-12-31"
                  value={dateValue}
                  onChange={(event) => setDateValue(event.target.value)}
                />
              </Field>
              <Field label="时分秒">
                <input
                  type="time"
                  step="1"
                  value={timeValue}
                  onChange={(event) => setTimeValue(event.target.value)}
                />
              </Field>
            </div>

            {dateToTimestamp.ok ? (
              <div className="conversion-results">
                <div className="conversion-row">
                  <span><small>秒</small><code>{dateToTimestamp.seconds}</code></span>
                  <CopyButton
                    value={dateToTimestamp.seconds}
                    copyKey="date-seconds"
                    copiedKey={copiedKey}
                    onCopy={copyValue}
                  />
                </div>
                <div className="conversion-row">
                  <span><small>毫秒</small><code>{dateToTimestamp.milliseconds}</code></span>
                  <CopyButton
                    value={dateToTimestamp.milliseconds}
                    copyKey="date-ms"
                    copiedKey={copiedKey}
                    onCopy={copyValue}
                  />
                </div>
              </div>
            ) : (
              <div className="time-inline-error">{dateToTimestamp.error}</div>
            )}
          </section>

          <section className="time-panel">
            <div className="time-panel-heading">
              <div>
                <span className="time-section-label">UNIX → DATE</span>
                <h2>时间戳 → 年月日时分秒</h2>
              </div>
              <button type="button" className="time-text-button" onClick={useCurrentTimestamp}>
                <RefreshCw size={13} />
                当前
              </button>
            </div>

            <div className="timestamp-unit-switch" role="group" aria-label="时间戳单位">
              {[
                ["auto", "自动"],
                ["seconds", "秒"],
                ["milliseconds", "毫秒"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={timestampUnit === value ? "active" : ""}
                  onClick={() => setTimestampUnit(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <Field label="Unix 时间戳">
              <input
                className="time-large-input"
                inputMode="decimal"
                value={timestampInput}
                onChange={(event) => setTimestampInput(event.target.value)}
                placeholder="例如 1795680000"
              />
            </Field>

            {timestampResult.ok ? (
              <div className="conversion-results datetime-results">
                <div className="conversion-row">
                  <span><small>本地时间 · {localZone}</small><code>{timestampResult.local}</code></span>
                  <CopyButton
                    value={timestampResult.local}
                    copyKey="ts-local"
                    copiedKey={copiedKey}
                    onCopy={copyValue}
                  />
                </div>
                <div className="conversion-row">
                  <span><small>UTC 时间</small><code>{timestampResult.utc}</code></span>
                  <CopyButton
                    value={timestampResult.utc}
                    copyKey="ts-utc"
                    copiedKey={copiedKey}
                    onCopy={copyValue}
                  />
                </div>
                <div className="conversion-row">
                  <span><small>ISO 8601</small><code>{timestampResult.iso}</code></span>
                  <CopyButton
                    value={timestampResult.iso}
                    copyKey="ts-iso"
                    copiedKey={copiedKey}
                    onCopy={copyValue}
                  />
                </div>
                <div className="timestamp-detected">
                  识别为{timestampResult.unit === "seconds" ? "秒" : "毫秒"} · {timestampResult.weekday}
                </div>
              </div>
            ) : (
              <div className="time-inline-error">{timestampResult.error}</div>
            )}
          </section>
        </div>

        <section className="calendar-panel">
          <div className="calendar-panel-heading">
            <div>
              <span className="time-section-label">CALENDAR CONVERSION</span>
              <h2>公历 / 农历互转</h2>
            </div>
            <div className="calendar-tabs" role="tablist" aria-label="历法转换方向">
              <button
                type="button"
                className={calendarMode === "solar-to-lunar" ? "active" : ""}
                onClick={() => setCalendarMode("solar-to-lunar")}
              >
                公历 → 农历
              </button>
              <button
                type="button"
                className={calendarMode === "lunar-to-solar" ? "active" : ""}
                onClick={() => setCalendarMode("lunar-to-solar")}
              >
                农历 → 公历
              </button>
            </div>
          </div>

          {calendarMode === "solar-to-lunar" ? (
            <div className="calendar-converter">
              <div className="calendar-inputs">
                <Field label="公历日期">
                  <input
                    type="date"
                    min={`${LUNAR_MIN_YEAR}-01-01`}
                    max={`${LUNAR_MAX_YEAR}-12-31`}
                    value={solarDate}
                    onChange={(event) => setSolarDate(event.target.value)}
                  />
                </Field>
                <button type="button" className="calendar-sync-button" onClick={syncLunarFromSolar}>
                  <ArrowRightLeft size={14} />
                  同步到农历输入
                </button>
              </div>

              {solarResult.ok ? (
                <div className="calendar-result">
                  <div className="calendar-result-icon"><CalendarDays size={24} /></div>
                  <span className="time-section-label">LUNAR DATE</span>
                  <h3>{solarResult.text}</h3>
                  <div className="calendar-meta">
                    <span>{solarResult.text.includes("闰") ? "含闰月" : "农历日期"}</span>
                    <span>属{solarResult.zodiac}</span>
                    <span>{solarResult.ganzhi}年</span>
                    <span>{formatWeekday(`${solarDate}T00:00:00`)}</span>
                  </div>
                  <div className="calendar-raw">
                    <code>{solarResult.year} / {solarResult.month} / {solarResult.day}</code>
                    <CopyButton
                      value={`${solarResult.year}-${solarResult.month}-${solarResult.day}`}
                      copyKey="lunar-date"
                      copiedKey={copiedKey}
                      onCopy={copyValue}
                      label="复制农历数值"
                    />
                  </div>
                </div>
              ) : (
                <div className="time-inline-error">{solarResult.error}</div>
              )}
            </div>
          ) : (
            <div className="calendar-converter">
              <div className="lunar-inputs">
                <Field label="农历年">
                  <input
                    type="number"
                    min={LUNAR_MIN_YEAR}
                    max={LUNAR_MAX_YEAR}
                    value={lunarDate.year}
                    onChange={(event) =>
                      setLunarDate((current) => ({ ...current, year: Number(event.target.value) }))
                    }
                  />
                </Field>
                <Field label="月份">
                  <select
                    value={lunarDate.month}
                    onChange={(event) =>
                      setLunarDate((current) => ({ ...current, month: Number(event.target.value) }))
                    }
                  >
                    {LUNAR_MONTH_OPTIONS.map((month) => (
                      <option value={month.value} key={month.value}>{month.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="日期">
                  <select
                    value={lunarDate.day}
                    onChange={(event) =>
                      setLunarDate((current) => ({ ...current, day: Number(event.target.value) }))
                    }
                  >
                    {LUNAR_DAY_OPTIONS.map((day) => (
                      <option value={day.value} key={day.value}>{day.label}</option>
                    ))}
                  </select>
                </Field>
                <label className={`lunar-leap-toggle ${leapMonth ? "" : "disabled"}`}>
                  <input
                    type="checkbox"
                    checked={lunarDate.leap}
                    disabled={!leapMonth}
                    onChange={(event) =>
                      setLunarDate((current) => ({ ...current, leap: event.target.checked }))
                    }
                  />
                  闰月
                  <small>{leapMonth ? `本年闰${LUNAR_MONTH_OPTIONS[leapMonth - 1].label}` : "本年无闰月"}</small>
                </label>
              </div>

              {lunarResult.ok ? (
                <div className="calendar-result">
                  <div className="calendar-result-icon"><CalendarDays size={24} /></div>
                  <span className="time-section-label">SOLAR DATE</span>
                  <h3>{lunarResult.text}</h3>
                  <div className="calendar-meta">
                    <span>{lunarResult.weekday}</span>
                    <span>{lunarResult.lunarText}</span>
                  </div>
                  <div className="calendar-raw">
                    <code>{lunarResult.text}</code>
                    <CopyButton
                      value={lunarResult.text}
                      copyKey="solar-date"
                      copiedKey={copiedKey}
                      onCopy={copyValue}
                      label="复制公历日期"
                    />
                  </div>
                </div>
              ) : (
                <div className="time-inline-error">{lunarResult.error}</div>
              )}
            </div>
          )}

          <div className="calendar-footnote">
            <Sparkles size={14} />
            农历转换支持 {LUNAR_MIN_YEAR}–{LUNAR_MAX_YEAR} 年，并按所选年份校验闰月和月份天数。
          </div>
        </section>

        <div className="time-info-strip">
          <div><Timer size={15} /><span>Unix 时间戳表示自 1970-01-01 00:00:00 UTC 起经过的时间。</span></div>
          <div><Hourglass size={15} /><span>自动模式按常见 10 位秒 / 13 位毫秒时间戳识别。</span></div>
        </div>
      </main>
    </div>
  );
}
