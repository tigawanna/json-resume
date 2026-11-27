import type { GithubSearchParams } from './github.dto.js';

function quoteSearchValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!/\s/.test(trimmed)) return trimmed;
  return `"${trimmed.replaceAll('"', '\\"')}"`;
}

export function buildGithubSearchQuery({
  login,
  params,
}: {
  login: string;
  params: GithubSearchParams;
}) {
  const parts = [`user:${login}`];
  if (params.query) parts.push(params.query);
  if (params.language)
    parts.push(`language:${quoteSearchValue(params.language)}`);
  if (params.topic) parts.push(`topic:${quoteSearchValue(params.topic)}`);
  if (params.minStars && params.minStars > 0)
    parts.push(`stars:>=${params.minStars}`);
  if (params.fork === 'all') parts.push('fork:true');
  if (params.fork === 'fork') parts.push('fork:only');
  if (params.archived === 'active') parts.push('archived:false');
  if (params.archived === 'archived') parts.push('archived:true');
  return parts.join(' ');
}
