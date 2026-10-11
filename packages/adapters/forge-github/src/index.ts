/**
 * ForgePort for GitHub over the REST API. Read-only for provenance in the MVP:
 * which pull request brought a commit in and who approved it. Tokens come from
 * a provider (VS Code's GitHub authentication session, GITHUB_TOKEN, or gh);
 * Gitleaf never stores them.
 */
import type { CommitReview, ForgePort, Repo, Review, ReviewState } from '@gitleaf/core';

export interface GitHubSlug {
  readonly host: string;
  readonly owner: string;
  readonly name: string;
}

/** Parses https and ssh remote URLs for github.com and GitHub Enterprise hosts. */
export function parseGitHubRemote(url: string): GitHubSlug | undefined {
  const trimmed = url
    .trim()
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
  let m = /^(?:https?|ssh):\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?\/([^/]+)\/([^/]+)$/.exec(trimmed);
  m ??= /^(?:[^@]+@)?([^:/]+):([^/]+)\/([^/]+)$/.exec(trimmed);
  if (!m) return undefined;
  const [, host, owner, name] = m;
  if (!host || !owner || !name) return undefined;
  return { host: host.toLowerCase(), owner, name };
}

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface GitHubForgeOptions {
  readonly token: () => Promise<string | undefined>;
  readonly remoteUrl: (repo: Repo['id']) => Promise<string | undefined>;
  readonly fetch?: FetchLike;
}

interface PullSummary {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  draft?: boolean;
  html_url: string;
  user?: { login?: string } | null;
}

interface ReviewSummary {
  state: string;
  user?: { login?: string } | null;
  submitted_at?: string;
}

function apiBase(slug: GitHubSlug): string {
  return slug.host === 'github.com' ? 'https://api.github.com' : `https://${slug.host}/api/v3`;
}

export class GitHubForge implements ForgePort {
  readonly #opts: GitHubForgeOptions;
  readonly #cache = new Map<string, Promise<CommitReview | undefined>>();

  constructor(opts: GitHubForgeOptions) {
    this.#opts = opts;
  }

  async #get(slug: GitHubSlug, path: string): Promise<unknown> {
    const token = await this.#opts.token();
    if (token === undefined) return undefined;
    const fetchImpl: FetchLike = this.#opts.fetch ?? globalThis.fetch;
    const res = await fetchImpl(`${apiBase(slug)}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) return undefined;
    return res.json();
  }

  async reviewForCommit(repo: Repo['id'], commit: string): Promise<CommitReview | undefined> {
    const key = `${repo}@${commit}`;
    let pending = this.#cache.get(key);
    if (!pending) {
      pending = this.#lookup(repo, commit);
      this.#cache.set(key, pending);
    }
    return pending;
  }

  async #lookup(repo: Repo['id'], commit: string): Promise<CommitReview | undefined> {
    const url = await this.#opts.remoteUrl(repo);
    const slug = url === undefined ? undefined : parseGitHubRemote(url);
    if (!slug) return undefined;
    const pulls = (await this.#get(
      slug,
      `/repos/${slug.owner}/${slug.name}/commits/${commit}/pulls`,
    )) as PullSummary[] | undefined;
    if (!Array.isArray(pulls) || pulls.length === 0) return undefined;
    // Prefer the merged pull request; otherwise the first open one.
    const pull = pulls.find((p) => p.merged_at !== null) ?? pulls[0];
    if (!pull) return undefined;
    const reviews = (await this.#get(
      slug,
      `/repos/${slug.owner}/${slug.name}/pulls/${String(pull.number)}/reviews`,
    )) as ReviewSummary[] | undefined;
    const latestByUser = new Map<string, string>();
    for (const r of reviews ?? []) {
      const login = r.user?.login;
      if (!login) continue;
      if (r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED' || r.state === 'DISMISSED')
        latestByUser.set(login, r.state);
    }
    const approvedBy = [...latestByUser.entries()]
      .filter(([, s]) => s === 'APPROVED')
      .map(([login]) => login)
      .sort();
    const state: ReviewState =
      pull.merged_at !== null
        ? 'merged'
        : pull.draft === true
          ? 'draft'
          : latestByUser.size > 0 && [...latestByUser.values()].includes('CHANGES_REQUESTED')
            ? 'changes-requested'
            : approvedBy.length > 0
              ? 'approved'
              : 'open';
    const review: Review = {
      id: String(pull.number),
      repo,
      title: pull.title,
      state,
      url: pull.html_url,
      ...(pull.user?.login ? { author: pull.user.login } : {}),
    };
    return { review, approvedBy };
  }

  listReviews(_repo: Repo['id']): Promise<readonly Review[]> {
    return Promise.reject(new Error('GitHubForge.listReviews arrives with the review stories'));
  }

  openReview(_repo: Repo['id'], _title: string, _body: string): Promise<Review> {
    return Promise.reject(
      new Error(
        'Gitleaf opens pull requests through the GitHub Pull Requests extension or the compare page',
      ),
    );
  }
}
