import { getCollection, type CollectionEntry } from 'astro:content';

import { DEFAULT_LOCALE, LOCALES, type Locale } from '../consts';
import { localizePath } from '../i18n/ui';

export type Post = CollectionEntry<'posts'>;

/** A post plus everything the templates need that is not in the frontmatter. */
export interface PostView {
  entry: Post;
  locale: Locale;
  slug: string;
  href: string;
  readingTime: number;
}

function parseId(id: string): { locale: Locale; slug: string } {
  const [head, ...rest] = id.split('/');
  const locale = LOCALES.find((l) => l === head);
  if (!locale || rest.length === 0) {
    throw new Error(
      `Post "${id}" must live at src/content/posts/<locale>/<slug>.mdx ` +
        `where <locale> is one of: ${LOCALES.join(', ')}`,
    );
  }
  return { locale, slug: rest.join('/') };
}

/**
 * Words-per-minute is a poor fit for Korean, which packs far more meaning per
 * character than English does. Count CJK characters and Latin words separately
 * and add the two estimates.
 */
export function estimateReadingTime(body: string): number {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/<[^>]+>/g, ' ') // JSX / HTML tags
    .replace(/\$\$[\s\S]*?\$\$/g, ' ') // display math
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1'); // links & images

  const cjk = (text.match(/[ㄱ-힝一-鿿぀-ヿ]/g) ?? []).length;
  const latinWords = (text.replace(/[ㄱ-힝一-鿿぀-ヿ]/g, ' ').match(/\b[\w'-]+\b/g) ?? [])
    .length;

  const minutes = cjk / 500 + latinWords / 220;
  return Math.max(1, Math.round(minutes));
}

function toView(entry: Post): PostView {
  const { locale, slug } = parseId(entry.id);
  return {
    entry,
    locale,
    slug,
    href: localizePath(`/posts/${slug}`, locale),
    readingTime: estimateReadingTime(entry.body ?? ''),
  };
}

/**
 * All posts for a locale, newest first. Drafts are excluded in production but
 * kept during `astro dev` so you can preview work in progress.
 */
export async function getPosts(locale: Locale): Promise<PostView[]> {
  const entries = await getCollection('posts', ({ id, data }) => {
    if (!id.startsWith(`${locale}/`)) return false;
    return import.meta.env.DEV || !data.draft;
  });

  return entries
    .map(toView)
    .sort((a, b) => b.entry.data.pubDate.valueOf() - a.entry.data.pubDate.valueOf());
}

/** Every post in every locale — used for `getStaticPaths`. */
export async function getAllPosts(): Promise<PostView[]> {
  const entries = await getCollection(
    'posts',
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
  return entries
    .map(toView)
    .sort((a, b) => b.entry.data.pubDate.valueOf() - a.entry.data.pubDate.valueOf());
}

/**
 * Which locales this article exists in, as a locale -> path map for the
 * language switcher and `hreflang`. Two posts are considered translations when
 * they share a slug, or when one names the other via `translationOf`.
 */
export async function getAlternates(
  view: PostView,
  all: PostView[],
): Promise<Partial<Record<Locale, string>>> {
  const target = view.entry.data.translationOf ?? view.slug;

  const alternates: Partial<Record<Locale, string>> = {};
  for (const locale of LOCALES) {
    const match = all.find(
      (candidate) =>
        candidate.locale === locale &&
        (candidate.slug === target || candidate.entry.data.translationOf === view.slug),
    );
    if (match) alternates[locale] = match.href;
  }
  // The current page is always available, even if the slugs do not line up.
  alternates[view.locale] = view.href;
  return alternates;
}

/** Tag -> post count, sorted by count then alphabetically. */
export function collectTags(posts: PostView[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.entry.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Newer/older neighbours within the same locale, for prev/next links. */
export function getNeighbours(
  view: PostView,
  posts: PostView[],
): { newer?: PostView; older?: PostView } {
  const index = posts.findIndex((p) => p.entry.id === view.entry.id);
  if (index === -1) return {};
  return { newer: posts[index - 1], older: posts[index + 1] };
}

/** Non-post pages exist in both locales, so alternates are mechanical. */
export function staticAlternates(path: string): Partial<Record<Locale, string>> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, localizePath(path, locale)]),
  ) as Partial<Record<Locale, string>>;
}

export { DEFAULT_LOCALE };
