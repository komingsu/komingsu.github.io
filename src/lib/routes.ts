import { DEFAULT_LOCALE, LOCALES, type Locale } from '../consts';

/**
 * `getStaticPaths` for any `[...locale]/…` route.
 *
 * The default locale gets `undefined` so it renders at the bare path (`/posts`)
 * while other locales get a prefix (`/en/posts`) — matching
 * `i18n.routing.prefixDefaultLocale: false` in astro.config.mjs.
 */
export function localePaths() {
  return LOCALES.map((locale) => ({
    params: { locale: locale === DEFAULT_LOCALE ? undefined : locale },
    props: { locale } as { locale: Locale },
  }));
}
