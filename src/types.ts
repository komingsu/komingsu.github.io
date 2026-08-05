/** Shared shapes used across components. Kept out of `.astro` files so both
 *  `.astro` and `.tsx` can import them without relying on Astro type exports. */

export interface Reference {
  id: string;
  authors: string;
  title: string;
  venue?: string;
  year?: string | number;
  url?: string;
}

/** A heading extracted from rendered Markdown, for the table of contents. */
export interface Heading {
  depth: number;
  slug: string;
  text: string;
}
