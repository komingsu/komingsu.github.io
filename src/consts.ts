/**
 * Single source of truth for site-wide metadata.
 * Imported by astro.config.mjs, so keep this file free of Astro-only imports.
 */

export const SITE = {
  url: 'https://komingsu.github.io',
  title: 'Ko Minsu',
  /** Used as the default `<meta name="description">` and in RSS feeds. */
  description: {
    ko: '과학·수학 원리를 딥러닝에 접목하는 연구 노트. 상호작용 가능한 시각화로 설명합니다.',
    en: 'Research notes on folding scientific and mathematical structure into deep learning — explained with interactive visualizations.',
  },
  author: 'Ko Minsu',
  /** Shown in the footer and used for `mailto:` links. */
  email: 'rh9872@naver.com',
  github: 'https://github.com/komingsu',
  /** Path (relative to /public) of the fallback social-share image. */
  defaultOgImage: '/og-default.png',
  /** Posts per page on archive listings. */
  postsPerPage: 12,
} as const;

export const LOCALES = ['ko', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ko';

/** BCP-47 tags, for `<html lang>` and `hreflang`. */
export const LOCALE_TAGS: Record<Locale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
};

export const LOCALE_NAMES: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
};
