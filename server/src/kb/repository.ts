import type { PoolClient } from 'pg';
import { pool } from '../db';
import type { KbArticleRow } from './types';

type Queryable = Pick<PoolClient, 'query'>;

const KB_ARTICLE_COLUMNS = `
  id,
  slug,
  title,
  content,
  updated_at,
  created_at
`;

export async function listKbArticles(db: Queryable = pool): Promise<KbArticleRow[]> {
  const result = await db.query<KbArticleRow>(
    `select ${KB_ARTICLE_COLUMNS}
     from kb_articles
     order by updated_at desc`,
  );
  return result.rows;
}

export async function findKbArticleBySlug(
  slug: string,
  db: Queryable = pool,
): Promise<KbArticleRow | null> {
  const result = await db.query<KbArticleRow>(
    `select ${KB_ARTICLE_COLUMNS}
     from kb_articles
     where slug = $1
     limit 1`,
    [slug],
  );
  return result.rowCount ? result.rows[0] : null;
}
