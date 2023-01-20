export function getHostname(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e: unknown) {
    return undefined;
  }
}

const units: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 31536000000 },
  { unit: "month", ms: 2628000000 },
  { unit: "day", ms: 86400000 },
  { unit: "hour", ms: 3600000 },
  { unit: "minute", ms: 60000 },
  { unit: "second", ms: 1000 },
];
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * Get language-sensitive relative time message from Dates.
 * @param relative  - the relative dateTime, generally is in the past or future
 * @param pivot     - the dateTime of reference, generally is the current time
 */
export function relativeTimeFromDates(relative: Date | null, pivot: Date = new Date()): string {
  if (!relative) return "";
  const elapsed = relative.getTime() - pivot.getTime();
  return relativeTimeFromElapsed(elapsed);
}

export function relativeTimeFromEpoch(date: number): string {
  return relativeTimeFromDates(new Date(date));
}

/**
 * Get language-sensitive relative time message from elapsed time.
 * @param elapsed   - the elapsed time in milliseconds
 */
export function relativeTimeFromElapsed(elapsed: number): string {
  for (const { unit, ms } of units) {
    if (Math.abs(elapsed) >= ms || unit === "second") {
      return rtf.format(Math.round(elapsed / ms), unit);
    }
  }
  return "";
}

// https://stackoverflow.com/questions/43242440/javascript-regular-expression-for-unicode-emoji
const emojiRegex =
  /^((\ud83c[\udde6-\uddff]){2}|([#*0-9]\u20e3)|(\u00a9|\u00ae|[\u2000-\u3300]|[\ud83c-\ud83e][\ud000-\udfff])((\ud83c[\udffb-\udfff])?(\ud83e[\uddb0-\uddb3])?(\ufe0f?\u200d([\u2000-\u3300]|[\ud83c-\ud83e][\ud000-\udfff])\ufe0f?)?)*)/g;

/**
 * Get the first emoji in a string.
 */
export function extractLeadingEmoji(text?: string): string | undefined {
  const match = text?.match(emojiRegex);
  return match ? match[0] : undefined;
}

export function stripLeadingEmoji(text?: string): string | undefined {
  return text?.replace(emojiRegex, "").trim();
}

export function filterUndefined<T>(arr: (T | undefined)[]): T[] {
  const filtered: T[] = [];
  for (const e of arr) {
    if (e !== undefined) {
      filtered.push(e);
    }
  }
  return filtered;
}

export function filterSettled<T>(results: PromiseSettledResult<T | undefined>[]): T[] {
  const filtered: T[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== undefined) {
      filtered.push(result.value);
    }
  }
  return filtered;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringToUCS2(str: string): string {
  let ucs2 = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode > 0xffff) {
      const surrogatePair = charCode.toString(16);
      const high = parseInt("0x" + surrogatePair.slice(0, -4));
      const low = parseInt("0x" + surrogatePair.slice(-4));
      ucs2 += "\\u" + high.toString(16) + "\\u" + low.toString(16);
    } else {
      ucs2 += "\\u" + charCode.toString(16);
    }
  }
  return ucs2;
}
