/**
 * Only images uploaded through the admin media endpoint (`/assets/<folder>/<file>`)
 * may advertise a campaign on the homepage. Anything else (an external URL, a
 * typo) would make `next/image` throw while rendering the homepage, so it is
 * rejected when saving AND skipped when reading.
 */
const HOME_IMAGE_PATTERN = /^\/assets\/(?:hero|banners|products|categories|brands)\/[A-Za-z0-9._-]+$/;

export function isValidHomeImagePath(value: string): boolean {
  return HOME_IMAGE_PATTERN.test(value);
}
