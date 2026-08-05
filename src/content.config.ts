import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7 deprecated the `z` re-export from `astro:content`; `astro/zod` is the
// supported path and avoids depending on zod being hoisted to the top level.
import { z } from 'astro/zod';

import { LOCALES } from './consts';

/**
 * Posts live at `src/content/posts/<locale>/<slug>.mdx`, which makes the
 * collection id `"<locale>/<slug>"`. Routes split on the first segment.
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      /** Hidden from listings and feeds, but still reachable by URL. */
      draft: z.boolean().default(false),
      /** Pins the post to the top of the home page. */
      featured: z.boolean().default(false),
      /** Social-share image. Falls back to SITE.defaultOgImage. */
      cover: image().optional(),
      coverAlt: z.string().optional(),
      /** Slug of the same article in the other locale, for the language switcher. */
      translationOf: z.string().optional(),
      /** Rendered as a "this post has interactive figures" hint in listings. */
      interactive: z.boolean().default(false),
      /** Bibliography entries referenced by <Cite> in the body. */
      references: z
        .array(
          z.object({
            id: z.string(),
            authors: z.string(),
            title: z.string(),
            venue: z.string().optional(),
            year: z.union([z.string(), z.number()]).optional(),
            url: z.url().optional(),
          }),
        )
        .default([]),
    }),
});

export const collections = { posts };

/** Narrow a collection id like `"ko/my-post"` into its parts. */
export function splitId(id: string): { locale: (typeof LOCALES)[number]; slug: string } {
  const [maybeLocale, ...rest] = id.split('/');
  const locale = LOCALES.find((l) => l === maybeLocale);
  if (!locale || rest.length === 0) {
    throw new Error(
      `Post "${id}" must live under a locale directory (${LOCALES.join(' | ')}), e.g. src/content/posts/ko/${id}.mdx`,
    );
  }
  return { locale, slug: rest.join('/') };
}
