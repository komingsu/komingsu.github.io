import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import { SITE, LOCALE_TAGS, type Locale } from '../../consts';
import { getPosts } from '../../lib/posts';
import { localePaths } from '../../lib/routes';

export const getStaticPaths = localePaths;

export async function GET(context: APIContext) {
  const locale = (context.props as { locale: Locale }).locale;
  const posts = await getPosts(locale);

  return rss({
    title: `${SITE.title} — ${locale === 'ko' ? '연구 노트' : 'Research notes'}`,
    description: SITE.description[locale],
    site: context.site ?? SITE.url,
    // Feed readers sort by date, but emit newest-first anyway.
    items: posts.map((post) => ({
      title: post.entry.data.title,
      description: post.entry.data.description,
      pubDate: post.entry.data.pubDate,
      link: post.href,
      categories: post.entry.data.tags,
    })),
    customData: `<language>${LOCALE_TAGS[locale]}</language>`,
  });
}
