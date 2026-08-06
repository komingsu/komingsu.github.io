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

/* ==========================================================================
   Categories
   ==========================================================================

   A post has exactly one category — the coarse "which shelf is this on"
   question — and any number of tags, which stay free-form. The ids are the URL
   segments (`/categories/sciml/`), so they are English and kebab-cased even
   though the displayed names are localised; renaming an id breaks permalinks,
   renaming a `name` does not.
   ========================================================================== */

export const CATEGORY_IDS = ['code-agents', 'sciml', 'reading', 'reflections'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Bucket for posts with no `category` in their frontmatter. */
export const UNCATEGORIZED_ID = 'other';
export type CategoryKey = CategoryId | typeof UNCATEGORIZED_ID;

export interface CategoryMeta {
  name: Record<Locale, string>;
  description: Record<Locale, string>;
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  'code-agents': {
    name: { ko: '코딩 에이전트', en: 'Coding Agents' },
    description: {
      ko: 'Claude Code 같은 코드 에이전트와 함께 일하는 기술 — 설정, 워크플로, 잘 안 되는 지점까지.',
      en: 'Working with code agents like Claude Code — setup, workflows, and where they break down.',
    },
  },
  sciml: {
    name: { ko: 'SciML', en: 'SciML' },
    description: {
      ko: '과학·수학의 구조를 딥러닝에 접목하는 이야기. 대체로 수식과 인터랙티브 그림이 함께 옵니다.',
      en: 'Folding scientific and mathematical structure into deep learning — usually with equations and figures you can poke at.',
    },
  },
  reading: {
    name: { ko: '독서', en: 'Reading' },
    description: {
      ko: '책과 논문을 읽고 남은 것. 요약보다는 반응에 가깝습니다.',
      en: 'What stayed with me from books and papers — reactions more than summaries.',
    },
  },
  reflections: {
    name: { ko: '사색', en: 'Reflections' },
    description: {
      ko: '나에 대한 질문과 철학. 기술 바깥에서 쓰는 글입니다.',
      en: 'Questions about myself, and philosophy — the writing that sits outside the technical.',
    },
  },
  [UNCATEGORIZED_ID]: {
    name: { ko: '기타', en: 'Other' },
    description: {
      ko: '아직 어느 분류에도 넣지 않은 글.',
      en: 'Posts not filed under a category yet.',
    },
  },
};

/** Sidebar / index order: the real categories first, "other" always last. */
export const CATEGORY_ORDER: CategoryKey[] = [...CATEGORY_IDS, UNCATEGORIZED_ID];
