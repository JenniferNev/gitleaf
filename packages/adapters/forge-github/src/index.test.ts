import { describe, expect, it } from 'vitest';
import { GitHubForge, parseGitHubRemote, type FetchLike } from './index.js';

describe('parseGitHubRemote', () => {
  it('handles https, ssh and enterprise forms', () => {
    expect(parseGitHubRemote('https://github.com/JenniferNev/gitleaf.git')).toEqual({
      host: 'github.com',
      owner: 'JenniferNev',
      name: 'gitleaf',
    });
    expect(parseGitHubRemote('git@github.com:acme/platform-docs.git')).toEqual({
      host: 'github.com',
      owner: 'acme',
      name: 'platform-docs',
    });
    expect(parseGitHubRemote('ssh://git@ghe.example.com:2222/acme/docs')).toEqual({
      host: 'ghe.example.com',
      owner: 'acme',
      name: 'docs',
    });
    expect(parseGitHubRemote('https://dev.azure.com/acme/platform/_git/docs')).toBeUndefined();
    expect(parseGitHubRemote('nonsense')).toBeUndefined();
  });
});

function fakeFetch(routes: Record<string, unknown>, calls: string[] = []): FetchLike {
  return (url, init) => {
    calls.push(url);
    expect(init.headers.Authorization).toBe('Bearer t0k');
    const path = url.replace('https://api.github.com', '');
    const body = routes[path];
    return Promise.resolve({
      ok: body !== undefined,
      status: body === undefined ? 404 : 200,
      json: () => Promise.resolve(body),
    });
  };
}

describe('GitHubForge.reviewForCommit', () => {
  const sha = 'a'.repeat(40);
  const routes = {
    [`/repos/acme/docs/commits/${sha}/pulls`]: [
      {
        number: 7,
        title: 'Open follow-up',
        state: 'open',
        merged_at: null,
        html_url: 'https://github.com/acme/docs/pull/7',
        user: { login: 'li' },
      },
      {
        number: 42,
        title: 'Release process',
        state: 'closed',
        merged_at: '2026-10-10T00:00:00Z',
        html_url: 'https://github.com/acme/docs/pull/42',
        user: { login: 'sam' },
      },
    ],
    '/repos/acme/docs/pulls/42/reviews': [
      { state: 'COMMENTED', user: { login: 'li' } },
      { state: 'CHANGES_REQUESTED', user: { login: 'maria' } },
      { state: 'APPROVED', user: { login: 'maria' } },
      { state: 'APPROVED', user: { login: 'li' } },
    ],
  };

  it('finds the merged pull request and the latest approval per reviewer, and caches', async () => {
    const calls: string[] = [];
    const forge = new GitHubForge({
      token: () => Promise.resolve('t0k'),
      remoteUrl: () => Promise.resolve('git@github.com:acme/docs.git'),
      fetch: fakeFetch(routes, calls),
    });
    const result = await forge.reviewForCommit('.', sha);
    expect(result).toEqual({
      review: {
        id: '42',
        repo: '.',
        title: 'Release process',
        state: 'merged',
        url: 'https://github.com/acme/docs/pull/42',
        author: 'sam',
      },
      approvedBy: ['li', 'maria'],
    });
    await forge.reviewForCommit('.', sha);
    expect(calls).toHaveLength(2);
  });

  it('degrades to undefined without a token, a GitHub remote, or a pull request', async () => {
    const noToken = new GitHubForge({
      token: () => Promise.resolve(undefined),
      remoteUrl: () => Promise.resolve('https://github.com/acme/docs'),
      fetch: fakeFetch(routes),
    });
    expect(await noToken.reviewForCommit('.', sha)).toBeUndefined();
    const noRemote = new GitHubForge({
      token: () => Promise.resolve('t0k'),
      remoteUrl: () => Promise.resolve(undefined),
      fetch: fakeFetch(routes),
    });
    expect(await noRemote.reviewForCommit('.', sha)).toBeUndefined();
    const noPr = new GitHubForge({
      token: () => Promise.resolve('t0k'),
      remoteUrl: () => Promise.resolve('https://github.com/acme/docs'),
      fetch: fakeFetch({ [`/repos/acme/docs/commits/${sha}/pulls`]: [] }),
    });
    expect(await noPr.reviewForCommit('.', sha)).toBeUndefined();
  });
});
