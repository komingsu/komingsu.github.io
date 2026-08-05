import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// Keep in sync with `SITE.url` in src/consts.ts. Duplicated deliberately: the
// config is loaded outside the TS path-alias context, so importing from src/
// here is fragile.
const SITE_URL = 'https://komingsu.github.io';

// Astro 7 moved Markdown rendering to `satteri`. We opt back into the
// remark/rehype pipeline because we depend on the unified ecosystem for math
// (remark-math + rehype-katex) and heading anchors. MDX inherits this processor.
const processor = unified({
  remarkPlugins: [remarkMath],
  rehypePlugins: [
    rehypeSlug,
    [
      rehypeAutolinkHeadings,
      {
        // `wrap` rather than `append`: an appended "#" is a real text node, and
        // Astro's heading extraction would pull it into the table of contents.
        // The visible marker is drawn by CSS instead (see .heading-anchor).
        behavior: 'wrap',
        properties: { className: ['heading-anchor'] },
      },
    ],
    [rehypeKatex, { output: 'html', throwOnError: false, strict: false }],
  ],
});

export default defineConfig({
  site: SITE_URL,
  // GitHub Pages 301s `/x` to `/x/`, so make dev match production and keep every
  // emitted URL on the form the host actually serves.
  trailingSlash: 'always',

  markdown: {
    processor,
    syntaxHighlight: { type: 'shiki' },
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: true,
    },
  },

  i18n: {
    locales: ['ko', 'en'],
    defaultLocale: 'ko',
    routing: { prefixDefaultLocale: false },
  },

  integrations: [
    mdx(),
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'ko',
        locales: { ko: 'ko-KR', en: 'en-US' },
      },
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
