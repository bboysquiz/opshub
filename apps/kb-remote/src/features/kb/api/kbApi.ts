import { getArticleMeta, kbDb, setArticleMeta, type Article } from '../infra/dexie';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';
const KB_CACHE_NAME = 'kb-articles-v1';

export type ArticleListItem = {
  id: string;
  slug: string;
  title: string;
  updatedAt: string;
  createdAt: string;
};

export type ArticleListResult = {
  items: ArticleListItem[];
  source: 'network' | 'idb';
};

type ArticleDto = ArticleListItem & {
  content: string;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeArticleListItem(item: ArticleListItem): ArticleListItem {
  return {
    ...item,
    updatedAt: String(item.updatedAt),
    createdAt: String(item.createdAt),
  };
}

function normalizeArticleDto(item: ArticleDto): ArticleDto {
  return {
    ...normalizeArticleListItem(item),
    content: String(item.content),
  };
}

function buildArticleUrl(slug: string) {
  return `${API_BASE_URL}/kb/articles/${encodeURIComponent(slug)}`;
}

async function findLocalArticleBySlug(slug: string): Promise<Article | undefined> {
  return kbDb.articles.where('slug').equals(slug).first();
}

async function cachePut(url: string, response: Response) {
  if (!('caches' in globalThis)) {
    return;
  }

  const cache = await caches.open(KB_CACHE_NAME);
  await cache.put(url, response);
}

async function cacheMatch(url: string): Promise<Response | null> {
  if (!('caches' in globalThis)) {
    return null;
  }

  const cache = await caches.open(KB_CACHE_NAME);
  return (await cache.match(url)) ?? null;
}

async function persistArticle(dto: ArticleDto, etag: string | null): Promise<Article> {
  const existing = await findLocalArticleBySlug(dto.slug);
  const article: Article = {
    ...normalizeArticleDto(dto),
    savedOffline: existing?.savedOffline ?? false,
  };

  await kbDb.articles.put(article);
  await setArticleMeta({
    slug: dto.slug,
    etag,
    lastFetchedAt: nowIso(),
  });

  return article;
}

async function restoreArticleFromCache(url: string, slug: string): Promise<Article | null> {
  const cached = await cacheMatch(url);
  if (!cached) {
    return null;
  }

  const dto = normalizeArticleDto((await cached.json()) as ArticleDto);
  const article = await persistArticle(dto, cached.headers.get('ETag'));

  if (article.slug !== slug) {
    throw new Error('Несовпадение slug у статьи из кэша');
  }

  return article;
}

async function getOfflineFallback(slug: string, url: string): Promise<Article> {
  const local = await findLocalArticleBySlug(slug);
  if (local) {
    return local;
  }

  const restored = await restoreArticleFromCache(url, slug);
  if (restored) {
    return restored;
  }

  throw new Error('Офлайн-режим: закэшированная статья не найдена');
}

export const kbApi = {
  async list(): Promise<ArticleListResult> {
    const url = `${API_BASE_URL}/kb/articles`;
    let res: Response;

    try {
      res = await fetch(url, { credentials: 'include' });
    } catch {
      const cachedArticles = await kbDb.articles.toArray();

      return {
        items: cachedArticles
          .map((article) =>
            normalizeArticleListItem({
              id: article.id,
              slug: article.slug,
              title: article.title,
              updatedAt: article.updatedAt,
              createdAt: article.createdAt,
            }),
          )
          .sort(
            (left, right) =>
              new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
          ),
        source: 'idb',
      };
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as { items: ArticleListItem[] };
    return {
      items: data.items.map(normalizeArticleListItem),
      source: 'network',
    };
  },

  async get(slug: string): Promise<Article> {
    const url = buildArticleUrl(slug);
    const meta = await getArticleMeta(slug);
    const headers = new Headers();

    if (meta?.etag) {
      headers.set('If-None-Match', meta.etag);
    }

    let res: Response;

    try {
      res = await fetch(url, {
        headers,
        credentials: 'include',
      });
    } catch {
      return getOfflineFallback(slug, url);
    }

    if (res.status === 304) {
      const local = await findLocalArticleBySlug(slug);
      if (local) {
        await setArticleMeta({
          slug,
          etag: meta?.etag ?? null,
          lastFetchedAt: nowIso(),
        });

        return local;
      }

      const restored = await restoreArticleFromCache(url, slug);
      if (restored) {
        return restored;
      }

      throw new Error('Сервер вернул 304, но локальная статья не найдена');
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const dto = normalizeArticleDto((await res.json()) as ArticleDto);
    const etag = res.headers.get('ETag');
    const article = await persistArticle(dto, etag);

    const responseForCache = new Response(JSON.stringify(dto), {
      headers: {
        'Content-Type': 'application/json',
        ...(etag ? { ETag: etag } : {}),
      },
    });

    await cachePut(url, responseForCache);

    return article;
  },
};
