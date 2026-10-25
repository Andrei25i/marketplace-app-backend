const BROWSERS: Array<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS/, "Firefox"],
  [/Chrome\/|CriOS/, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: Array<[RegExp, string]> = [
  [/Windows/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

const match = (ua: string, rules: Array<[RegExp, string]>, fallback: string) =>
  rules.find(([regex]) => regex.test(ua))?.[1] ?? fallback;

export const getDeviceInfo = (userAgent?: string | null) => ({
  browser: userAgent
    ? match(userAgent, BROWSERS, "Browser")
    : "Browser necunoscut",
  os: userAgent
    ? match(userAgent, SYSTEMS, "Dispozitiv")
    : "Dispozitiv necunoscut",
});
