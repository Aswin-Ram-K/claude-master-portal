import { Octokit } from "@octokit/rest";

let octokitInstance: Octokit | null = null;

function getOctokit(): Octokit {
  if (!octokitInstance) {
    const token = process.env.GITHUB_TOKEN;
    octokitInstance = new Octokit(token ? { auth: token } : {});
  }
  return octokitInstance;
}

export interface GitHubRepo {
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  updatedAt: string;
}

/**
 * List all repos for the configured GitHub user that might have Claude logs.
 */
export async function listUserRepos(
  username?: string
): Promise<GitHubRepo[]> {
  const octokit = getOctokit();
  const user = username ?? process.env.GITHUB_USERNAME;

  if (!user) {
    // Try to get authenticated user
    try {
      const { data } = await octokit.users.getAuthenticated();
      return listReposForUser(octokit, data.login);
    } catch {
      return [];
    }
  }

  return listReposForUser(octokit, user);
}

async function listReposForUser(
  octokit: Octokit,
  username: string
): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.repos.listForUser({
      username,
      per_page: 100,
      page,
      sort: "updated",
    });
    if (data.length === 0) break;

    for (const repo of data) {
      repos.push({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        description: repo.description,
        updatedAt: repo.updated_at ?? "",
      });
    }

    if (data.length < 100) break;
    page++;
  }

  return repos;
}

export interface ClaudeLogFile {
  name: string;
  path: string;
  content: string;
}

/**
 * Fetch .claude-logs/ directory contents from a GitHub repo.
 */
export async function fetchClaudeLogs(
  owner: string,
  repo: string
): Promise<ClaudeLogFile[]> {
  const octokit = getOctokit();
  const logs: ClaudeLogFile[] = [];

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: ".claude-logs",
    });

    if (!Array.isArray(data)) return logs;

    // Fetch each JSON file
    for (const file of data) {
      if (file.type !== "file" || !file.name.endsWith(".json")) continue;

      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path: file.path,
        });

        if ("content" in fileData && typeof fileData.content === "string") {
          const content = Buffer.from(fileData.content, "base64").toString(
            "utf-8"
          );
          logs.push({ name: file.name, path: file.path, content });
        }
      } catch {
        // Skip files that can't be read
      }
    }
  } catch {
    // No .claude-logs/ directory in this repo — that's fine
  }

  return logs;
}

/**
 * Check if a repo has a .claude-logs/ directory.
 */
export async function hasClaudeLogs(
  owner: string,
  repo: string
): Promise<boolean> {
  const octokit = getOctokit();
  try {
    await octokit.repos.getContent({ owner, repo, path: ".claude-logs" });
    return true;
  } catch {
    return false;
  }
}
