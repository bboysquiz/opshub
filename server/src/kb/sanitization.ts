import { KbError } from './errors';
import type { CreateKbArticleInput, UpdateKbArticleInput } from './types';

type TextMode = 'single-line' | 'multi-line';

const TRAILING_SPACES_RE = /[^\S\n]+$/gm;

const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /<\s*script\b/i, description: 'теги <script>' },
  {
    pattern: /<\s*(iframe|object|embed|svg|math|style|link|meta|base)\b/i,
    description: 'опасные HTML-теги',
  },
  { pattern: /on[a-z]+\s*=/i, description: 'inline-обработчики событий' },
  { pattern: /\bjavascript\s*:/i, description: 'javascript:-ссылки' },
  { pattern: /\bvbscript\s*:/i, description: 'vbscript:-ссылки' },
  { pattern: /\bdata\s*:\s*text\/html/i, description: 'data:text/html payload' },
  { pattern: /&#(?:x0*3c|0*60);?/i, description: 'HTML-encoded открывающие теги' },
  { pattern: /&lt;\s*(script|iframe|object|embed|svg|math)\b/i, description: 'encoded HTML-теги' },
];

function normalizeKbText(value: string, mode: TextMode): string {
  let normalized = stripUnsafeControlCharacters(value.normalize('NFKC')).replace(/\r\n?/g, '\n');

  if (mode === 'single-line') {
    return normalized.replace(/\s+/g, ' ').trim();
  }

  normalized = normalized.replace(TRAILING_SPACES_RE, '');
  return normalized.trim();
}

function stripUnsafeControlCharacters(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return !(
        (code >= 0x00 && code <= 0x08) ||
        code === 0x0b ||
        code === 0x0c ||
        (code >= 0x0e && code <= 0x1f) ||
        code === 0x7f
      );
    })
    .join('');
}

function assertNoDangerousMarkup(fieldName: string, value: string): void {
  const match = DANGEROUS_PATTERNS.find(({ pattern }) => pattern.test(value));

  if (match) {
    throw new KbError(
      400,
      `${fieldName}: запрещены ${match.description}. KB сейчас принимает plain text без HTML/JS-вставок.`,
    );
  }
}

function sanitizeRequiredField(fieldName: string, value: string, mode: TextMode): string {
  const normalized = normalizeKbText(value, mode);

  if (!normalized) {
    throw new KbError(400, `${fieldName}: поле не может быть пустым`);
  }

  assertNoDangerousMarkup(fieldName, normalized);
  return normalized;
}

function sanitizeOptionalField(
  fieldName: string,
  value: string | undefined,
  mode: TextMode,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return sanitizeRequiredField(fieldName, value, mode);
}

export function sanitizeCreateKbArticleInput(payload: CreateKbArticleInput): CreateKbArticleInput {
  return {
    slug: sanitizeRequiredField('Slug', payload.slug, 'single-line'),
    title: sanitizeRequiredField('Заголовок', payload.title, 'single-line'),
    content: sanitizeRequiredField('Содержимое', payload.content, 'multi-line'),
  };
}

export function sanitizeUpdateKbArticleInput(payload: UpdateKbArticleInput): UpdateKbArticleInput {
  return {
    slug: sanitizeOptionalField('Slug', payload.slug, 'single-line'),
    title: sanitizeOptionalField('Заголовок', payload.title, 'single-line'),
    content: sanitizeOptionalField('Содержимое', payload.content, 'multi-line'),
  };
}
