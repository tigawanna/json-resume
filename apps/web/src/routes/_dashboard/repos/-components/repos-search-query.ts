import type {
  GithubRepoForkFilter,
  GithubRepoSort,
  GithubRepoOrder,
} from "@/data-access-layer/github/repos.functions";

export type RepoArchivedFilter = "any" | "active" | "archived";

export type RepoSearchFilters = {
  query: string;
  language: string;
  topic: string;
  minStars: string;
  fork: GithubRepoForkFilter;
  archived: RepoArchivedFilter;
  sort: GithubRepoSort;
  order: GithubRepoOrder;
};

export const defaultRepoSearch: RepoSearchFilters = {
  query: "",
  language: "",
  topic: "",
  minStars: "",
  fork: "source",
  archived: "active",
  sort: "updated",
  order: "desc",
};

function quoteQualifier(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/\s/.test(trimmed)) return trimmed;
  return `"${trimmed.replaceAll('"', '\\"')}"`;
}

export function buildRepoSearchPreview(filters: RepoSearchFilters): string {
  const parts = ["user:{you}"];
  if (filters.query.trim()) parts.push(filters.query.trim());
  if (filters.language.trim()) parts.push(`language:${quoteQualifier(filters.language)}`);
  if (filters.topic.trim()) parts.push(`topic:${quoteQualifier(filters.topic)}`);
  if (filters.minStars) {
    const n = Number(filters.minStars);
    if (Number.isFinite(n) && n > 0) parts.push(`stars:>=${n}`);
  }
  if (filters.fork === "all") parts.push("fork:true");
  if (filters.fork === "fork") parts.push("fork:only");
  if (filters.archived === "active") parts.push("archived:false");
  if (filters.archived === "archived") parts.push("archived:true");
  return parts.join(" ");
}

function unquoteQualifier(tok: string): string {
  const t = tok.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/\\(["\\])/g, "$1");
  }
  return t;
}

export function parseRepoSearchBar(raw: string, prev: RepoSearchFilters): RepoSearchFilters {
  let text = raw
    .trim()
    .replace(/^user:(\{you\}|[^\s]+)\s+/i, "")
    .trim();

  let language = "";
  const langPat = /\blanguage:((?:"(?:\\.|[^"\\])*"|[^\s]+))/i;
  const langMat = langPat.exec(text);
  if (langMat) {
    language = unquoteQualifier(langMat[1]);
    text = text.slice(0, langMat.index!) + text.slice(langMat.index! + langMat[0].length);
    text = text.replace(/\s+/g, " ").trim();
  }

  let topic = "";
  const topicPat = /\btopic:((?:"(?:\\.|[^"\\])*"|[^\s]+))/i;
  const topicMat = topicPat.exec(text);
  if (topicMat) {
    topic = unquoteQualifier(topicMat[1]);
    text = text.slice(0, topicMat.index!) + text.slice(topicMat.index! + topicMat[0].length);
    text = text.replace(/\s+/g, " ").trim();
  }

  let minStars = "";
  const starsPat = /\bstars:>=(\d+)\b/i;
  const starsMat = starsPat.exec(text);
  if (starsMat) {
    minStars = starsMat[1];
    text = text.slice(0, starsMat.index!) + text.slice(starsMat.index! + starsMat[0].length);
    text = text.replace(/\s+/g, " ").trim();
  }

  let forkResolved: GithubRepoForkFilter = "source";
  let forkMatched = false;
  const forkOnlyMat = /\bfork:only\b/i.exec(text);
  if (forkOnlyMat) {
    forkResolved = "fork";
    forkMatched = true;
    text =
      text.slice(0, forkOnlyMat.index!) + text.slice(forkOnlyMat.index! + forkOnlyMat[0].length);
    text = text.replace(/\s+/g, " ").trim();
  } else {
    const forkTruePat = /\bfork:true\b/i.exec(text);
    if (forkTruePat) {
      forkResolved = "all";
      forkMatched = true;
      text =
        text.slice(0, forkTruePat.index!) + text.slice(forkTruePat.index! + forkTruePat[0].length);
      text = text.replace(/\s+/g, " ").trim();
    }
  }

  let archivedResolved = prev.archived;
  let archivedMatched = false;
  const archivedFalsePat = /\barchived:false\b/i.exec(text);
  if (archivedFalsePat) {
    archivedResolved = "active";
    archivedMatched = true;
    text =
      text.slice(0, archivedFalsePat.index!) +
      text.slice(archivedFalsePat.index! + archivedFalsePat[0].length);
    text = text.replace(/\s+/g, " ").trim();
  } else {
    const archivedTruePat = /\barchived:true\b/i.exec(text);
    if (archivedTruePat) {
      archivedResolved = "archived";
      archivedMatched = true;
      text =
        text.slice(0, archivedTruePat.index!) +
        text.slice(archivedTruePat.index! + archivedTruePat[0].length);
      text = text.replace(/\s+/g, " ").trim();
    }
  }

  text = text.replace(/\s+/g, " ").trim();

  return {
    ...prev,
    query: text,
    language,
    topic,
    minStars,
    fork: forkMatched ? forkResolved : "source",
    archived: archivedMatched ? archivedResolved : prev.archived,
    sort: prev.sort,
    order: prev.order,
  };
}
