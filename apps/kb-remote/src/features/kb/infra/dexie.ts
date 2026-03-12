import Dexie, { type Table } from 'dexie';

export type Article = {
  id: string;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
  createdAt: string;
  savedOffline: boolean;
};

export type ArticleMeta = {
  slug: string;
  etag: string | null;
  lastFetchedAt: string | null;
};

class KbDexie extends Dexie {
  articles!: Table<Article, string>;
  meta!: Table<ArticleMeta, string>;

  constructor() {
    super('opshub_kb');

    this.version(1).stores({
      articles: 'id, slug, updatedAt, savedOffline',
      meta: 'slug',
    });
  }
}

export const kbDb = new KbDexie();

export async function getArticleMeta(slug: string): Promise<ArticleMeta | null> {
  return (await kbDb.meta.get(slug)) ?? null;
}

export async function setArticleMeta(meta: ArticleMeta): Promise<void> {
  await kbDb.meta.put(meta);
}

export async function deleteArticleMeta(slug: string): Promise<void> {
  await kbDb.meta.delete(slug);
}
