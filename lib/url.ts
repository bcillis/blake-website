/** Bare host of a URL, with leading `www.` stripped. Falls back to a best-effort
 *  strip when the URL isn't parseable, so we never throw on user input. */
export const hostFromUrl = (url: string): string => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
};
