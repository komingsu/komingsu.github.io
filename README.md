# komingsu.github.io

Research notes with interactive figures — [komingsu.github.io](https://komingsu.github.io)

Built with [Astro](https://astro.build) + MDX. Posts are Markdown with real React
components embedded in them, so a figure can be something the reader changes
rather than a picture they look at.

## Running it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # production build into dist/
npm run preview  # serve dist/ locally
npm run check    # TypeScript + Astro diagnostics
```

Node 24 is required (see `.nvmrc`); `nvm use` picks it up.

## Writing a post

Create `src/content/posts/<locale>/<slug>.mdx`, where `<locale>` is `ko` or `en`.
Korean is the default locale and serves from `/posts/<slug>`; English serves from
`/en/posts/<slug>`. Give a translation the **same slug** as its counterpart and
the language switcher links them automatically.

```mdx
---
title: 글 제목
description: 목록·검색·소셜 카드에 쓰이는 한 문장 요약
pubDate: 2026-08-06
tags: ['optimization']
featured: false    # 홈 상단 고정
interactive: false # 목록에 배지 표시
draft: false       # 목록·피드에서 숨김 (dev 서버에서는 보임)
---
```

The schema is enforced in `src/content.config.ts` — a missing field or a bad date
**fails the build** instead of shipping broken.

`/posts/blog-toolkit` is the live reference for every authoring component:
math, margin notes, callouts, figure widths, citations, and interactive islands.

### Interactive figures

Put the React component in `src/components/interactive/`, then:

```mdx
import Interactive from '../../../components/Interactive.astro';
import MyDemo from '../../../components/interactive/MyDemo.tsx';

<Interactive label="그림 1." caption="설명" width="full">
  <MyDemo client:visible />
</Interactive>
```

Without a `client:*` directive the component renders as static HTML and does
nothing. Only components carrying a directive ship JavaScript, so a post with no
interactive figures ships effectively none.

`OptimizerLab.tsx` is the worked example — canvas field, SVG overlay, log-scale
chart, legend, keyboard-reachable tooltip, and a table view.

## Layout

Article content lives in a CSS grid with named columns, so an element declares
the width it wants instead of computing one:

| Class | Width |
| --- | --- |
| *(default)* | the reading column |
| `col-wide` | reading column + margin gutter |
| `col-full` | edge to edge |

`<MarginNote>` escapes into the right gutter on wide screens and folds inline on
narrow ones.

## Colors in figures

Chart colors are not hand-picked. Categorical series use validated palette slots
(see the comment block in `OptimizerLab.css`); the loss field uses a neutral
sequential ramp so the colored series stay legible over it. If you add a chart,
keep series identity on the documented slots and re-validate rather than
eyeballing new hues.

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. Pages must be set to **Source: GitHub Actions**.

## Regenerating the social image

`public/og-default.png` is generated, not hand-drawn:

```bash
node scripts/make-og-image.mjs
```

Social platforms do not reliably render SVG for `og:image`, which is why this is
a raster file.
