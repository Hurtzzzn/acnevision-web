/** Admin pages that read the period selects (Dashboard and Monitoring Model). Kelola User and Audit Log do not. */
const PERIOD_PAGES = ['/admin', '/admin/model'];

/** True when the period selects in the admin header matter for this path. A trailing slash is ignored. */
export function usesPeriod(pathname: string): boolean {
  return PERIOD_PAGES.includes(pathname.replace(/\/+$/, '') || '/');
}
