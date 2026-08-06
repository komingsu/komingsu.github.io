import { DEFAULT_LOCALE, type Locale } from '../consts';

export const ui = {
  ko: {
    'nav.home': '홈',
    'nav.posts': '글',
    'nav.tags': '태그',
    'nav.categories': '분류',
    'nav.about': '소개',
    'nav.rss': 'RSS',
    'home.tagline': '과학·수학 원리를 딥러닝에 접목하는 연구 노트',
    'home.intro':
      '수식은 그림으로, 그림은 만져볼 수 있게. 논문 한 편을 읽고 끝내는 대신, 직접 값을 바꿔 보며 이해하는 글을 씁니다.',
    'home.featured': '추천 글',
    'home.recent': '최근 글',
    'home.all': '전체 글 보기',
    'home.empty': '아직 발행된 글이 없습니다.',
    'posts.title': '글 목록',
    'posts.count': (n: number) => `글 ${n}편`,
    'post.published': '발행',
    'post.updated': '수정',
    'post.readingTime': (n: number) => `약 ${n}분`,
    'post.toc': '목차',
    'post.interactive': '인터랙티브',
    'post.references': '참고문헌',
    'post.footnotes': '주석',
    'post.backToPosts': '글 목록으로',
    'post.draft': '초고',
    'post.prev': '이전 글',
    'post.next': '다음 글',
    'tags.title': '태그',
    'tags.postsTagged': (tag: string) => `“${tag}” 태그가 붙은 글`,
    'tags.all': '태그 전체',
    'categories.title': '분류',
    'categories.lede': '글은 네 갈래로 나뉩니다. 한 편은 한 갈래에만 속하고, 세부 주제는 태그가 맡습니다.',
    'categories.allPosts': '전체 글',
    'sidebar.label': '글 분류',
    'about.title': '소개',
    'lang.switch': '언어',
    'lang.unavailable': '이 글은 아직 영어판이 없습니다.',
    'theme.toggle': '테마 전환',
    'notfound.title': '페이지를 찾을 수 없습니다',
    'notfound.body': '주소가 바뀌었거나 삭제된 글일 수 있습니다.',
    'notfound.home': '홈으로 돌아가기',
    'footer.builtWith': 'Astro로 만들었습니다',
  },
  en: {
    'nav.home': 'Home',
    'nav.posts': 'Posts',
    'nav.tags': 'Tags',
    'nav.categories': 'Categories',
    'nav.about': 'About',
    'nav.rss': 'RSS',
    'home.tagline': 'Research notes on folding scientific structure into deep learning',
    'home.intro':
      'Equations become pictures, and pictures become things you can touch. I write explanations you can poke at instead of just read.',
    'home.featured': 'Featured',
    'home.recent': 'Recent posts',
    'home.all': 'All posts',
    'home.empty': 'No posts published yet.',
    'posts.title': 'Posts',
    'posts.count': (n: number) => `${n} post${n === 1 ? '' : 's'}`,
    'post.published': 'Published',
    'post.updated': 'Updated',
    'post.readingTime': (n: number) => `${n} min read`,
    'post.toc': 'Contents',
    'post.interactive': 'Interactive',
    'post.references': 'References',
    'post.footnotes': 'Footnotes',
    'post.backToPosts': 'All posts',
    'post.draft': 'Draft',
    'post.prev': 'Previous',
    'post.next': 'Next',
    'tags.title': 'Tags',
    'tags.postsTagged': (tag: string) => `Posts tagged “${tag}”`,
    'tags.all': 'All tags',
    'categories.title': 'Categories',
    'categories.lede':
      'Everything here falls into one of four categories. A post belongs to exactly one; tags carry the finer subject matter.',
    'categories.allPosts': 'All posts',
    'sidebar.label': 'Post categories',
    'about.title': 'About',
    'lang.switch': 'Language',
    'lang.unavailable': 'This post has no Korean version yet.',
    'theme.toggle': 'Toggle theme',
    'notfound.title': 'Page not found',
    'notfound.body': 'The URL may have changed, or the post may have been removed.',
    'notfound.home': 'Back to home',
    'footer.builtWith': 'Built with Astro',
  },
} as const;

type UiKey = keyof (typeof ui)['ko'];

/**
 * Returns a lookup function for the given locale, falling back to the default
 * locale so a missing translation degrades to Korean rather than to `undefined`.
 */
export function useTranslations(locale: Locale) {
  return function t<K extends UiKey>(key: K): (typeof ui)['ko'][K] {
    const table = ui[locale] as (typeof ui)['ko'];
    return (table[key] ?? ui[DEFAULT_LOCALE][key]) as (typeof ui)['ko'][K];
  };
}

/**
 * Normalises a page path to the trailing-slash form.
 *
 * GitHub Pages serves `dist/x/index.html` at `/x/` and 301s `/x` to it. Every
 * URL we emit — canonical, hreflang, sitemap, nav, feed links — therefore has to
 * end in a slash, or the canonical tag points at a redirect.
 */
export function pagePath(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return clean.endsWith('/') ? clean : `${clean}/`;
}

/** Prefixes a page path with the locale, honouring `prefixDefaultLocale: false`. */
export function localizePath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const prefixed = locale === DEFAULT_LOCALE ? clean : `/${locale}${clean === '/' ? '' : clean}`;
  return pagePath(prefixed);
}

/** Feed paths are files, not pages, so they never take a trailing slash. */
export function rssPath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/rss.xml' : `/${locale}/rss.xml`;
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: locale === 'ko' ? 'long' : 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
