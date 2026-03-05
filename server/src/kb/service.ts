import { findKbArticleBySlug, listKbArticles } from './repository';
import type { KbArticleDto, KbArticleListItemDto, KbArticleRow } from './types';

function mapListItem(row: KbArticleRow): KbArticleListItemDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function mapArticle(row: KbArticleRow): KbArticleDto {
  return {
    ...mapListItem(row),
    content: row.content,
  };
}

export function buildKbArticleEtag(article: Pick<KbArticleRow, 'id' | 'updated_at'>): string {
  const updatedAtMs = new Date(article.updated_at).getTime();
  return `"${article.id}:${updatedAtMs}"`;
}

function normalizeEtag(tag: string): string {
  return tag.trim().replace(/^W\//, '');
}

export function ifNoneMatchMatches(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false;

  const target = normalizeEtag(etag);

  return ifNoneMatch
    .split(',')
    .map((part) => part.trim())
    .some((candidate) => candidate === '*' || normalizeEtag(candidate) === target);
}

export async function getKbArticlesList(): Promise<KbArticleListItemDto[]> {
  const rows = await listKbArticles();
  return rows.map(mapListItem);
}

export async function getKbArticleBySlug(
  slug: string,
): Promise<{ article: KbArticleDto; etag: string } | null> {
  const row = await findKbArticleBySlug(slug);
  if (!row) return null;

  return {
    article: mapArticle(row),
    etag: buildKbArticleEtag(row),
  };
}
