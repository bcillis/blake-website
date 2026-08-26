/** Public favicon URL from Google's endpoint. `sz` is the requested pixel size;
 *  Google returns the closest match. Used as the default image on Websites and
 *  Wishlist cards when the entry has no user-supplied image. */
export const faviconFor = (host: string, sz: number = 128): string =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${sz}`;
