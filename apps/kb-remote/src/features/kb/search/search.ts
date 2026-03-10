import MiniSearch from 'minisearch';
import type { Article } from '../infra/dexie';

export type SearchDoc = {
  id: string;
  slug: string;
  title: string;
  content: string;
};

let mini: MiniSearch<SearchDoc> | null = null;

export function buildIndex(articles: Article[]) {
  mini = new MiniSearch<SearchDoc>({
    fields: ['title', 'content'],
    storeFields: ['id', 'slug', 'title'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
    },
  });

  mini.addAll(
    articles.map((article) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      content: article.content,
    })),
  );
}

export function clearIndex() {
  mini = null;
}

export function searchArticles(query: string) {
  if (!mini || !query.trim()) {
    return [];
  }

  return mini.search(query.trim()).slice(0, 20);
}
