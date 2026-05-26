import { createServer } from "node:http";

const port = Number(process.env.PLAYWRIGHT_GITHUB_MOCK_PORT ?? 3052);

const repos = [
  {
    id: 101,
    name: "agentic-json-resume",
    full_name: "playwright-user/agentic-json-resume",
    html_url: "https://github.com/playwright-user/agentic-json-resume",
    homepage: "https://agentic-json-resume.example.com",
    description: "Resume automation workspace with structured JSON exports.",
    private: false,
    fork: false,
    archived: false,
    language: "TypeScript",
    stargazers_count: 42,
    topics: ["resume", "react", "typescript"],
    updated_at: "2026-05-20T12:00:00Z",
  },
  {
    id: 102,
    name: "legacy-portfolio",
    full_name: "playwright-user/legacy-portfolio",
    html_url: "https://github.com/playwright-user/legacy-portfolio",
    homepage: "https://legacy-portfolio.example.com",
    description: "Archived portfolio experiment kept for historical reference.",
    private: false,
    fork: false,
    archived: true,
    language: "JavaScript",
    stargazers_count: 7,
    topics: ["portfolio", "archive"],
    updated_at: "2025-10-10T12:00:00Z",
  },
  {
    id: 103,
    name: "forked-template",
    full_name: "playwright-user/forked-template",
    html_url: "https://github.com/playwright-user/forked-template",
    homepage: "",
    description: "Forked template used to verify repository filters.",
    private: false,
    fork: true,
    archived: false,
    language: "TypeScript",
    stargazers_count: 3,
    topics: ["template"],
    updated_at: "2026-01-15T12:00:00Z",
  },
];

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  response.end(JSON.stringify(body));
}

function searchRepos(url) {
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const sort = url.searchParams.get("sort");
  const order = url.searchParams.get("order") ?? "desc";

  let filtered = repos.slice();

  if (q.includes("archived:false")) {
    filtered = filtered.filter((repo) => !repo.archived);
  } else if (q.includes("archived:true")) {
    filtered = filtered.filter((repo) => repo.archived);
  }

  if (!q.includes("fork:true") && !q.includes("fork:only")) {
    filtered = filtered.filter((repo) => !repo.fork);
  } else if (q.includes("fork:only")) {
    filtered = filtered.filter((repo) => repo.fork);
  }

  const language = /language:("[^"]+"|\S+)/i.exec(q)?.[1]?.replaceAll('"', "");
  if (language) {
    filtered = filtered.filter((repo) => repo.language.toLowerCase() === language);
  }

  const topic = /topic:("[^"]+"|\S+)/i.exec(q)?.[1]?.replaceAll('"', "");
  if (topic) {
    filtered = filtered.filter((repo) => repo.topics.includes(topic));
  }

  const minStars = /stars:>=(\d+)/i.exec(q)?.[1];
  if (minStars) {
    filtered = filtered.filter((repo) => repo.stargazers_count >= Number(minStars));
  }

  const freeText = q
    .replace(/\buser:\S+/g, "")
    .replace(/\blanguage:("[^"]+"|\S+)/g, "")
    .replace(/\btopic:("[^"]+"|\S+)/g, "")
    .replace(/\bstars:>=\d+/g, "")
    .replace(/\bfork:(true|only)\b/g, "")
    .replace(/\barchived:(true|false)\b/g, "")
    .trim();

  if (freeText) {
    filtered = filtered.filter((repo) => {
      const searchable = [repo.name, repo.full_name, repo.description, ...repo.topics]
        .join(" ")
        .toLowerCase();
      return searchable.includes(freeText);
    });
  }

  if (sort === "stars") {
    filtered.sort((a, b) => a.stargazers_count - b.stargazers_count);
    if (order !== "asc") filtered.reverse();
  } else {
    filtered.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    if (order !== "asc") filtered.reverse();
  }

  return {
    total_count: filtered.length,
    incomplete_results: false,
    items: filtered,
  };
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/user") {
    sendJson(response, 200, {
      id: 9001,
      login: "playwright-user",
      name: "Playwright User",
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/search/repositories") {
    sendJson(response, 200, searchRepos(url));
    return;
  }

  sendJson(response, 404, {
    message: `Unhandled GitHub mock route: ${request.method} ${url.pathname}`,
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock GitHub API listening at http://127.0.0.1:${port}`);
});
