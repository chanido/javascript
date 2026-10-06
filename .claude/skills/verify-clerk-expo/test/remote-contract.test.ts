import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { agentDeviceFor } from '../src/core/agent-device.ts';
import { chooseEgress } from '../src/core/launch.mjs';
import { usedSecretValues } from '../src/core/secret.ts';
import type { ApiResponse, GitHub } from '../src/core/remote/github.ts';
import { connectThroughProxy, egressCheck, remoteDoctorChecks } from '../src/core/remote/preflight.ts';
import { RUN_TITLE, STEP, probeEcho, triggerBranch, type SessionRequest } from '../src/core/remote/protocol.ts';
import type { RemoteSettings } from '../src/core/remote/settings.ts';
import type { LocalLease, RemoteLease } from '../src/core/types.ts';

describe('the session workflow and the driver agree', () => {
  const workflow = readFileSync(join(import.meta.dirname, '..', '..', '..', '..', '.github', 'workflows', 'verify-remote.yml'), 'utf8');
  const names = [...workflow.matchAll(/^\s+- name: (.+)$/gm)].map((m) => m[1]!);
  const evaluated = (template: string, value: string) => template.replace(/\$\{\{[^}]+\}\}/, value);

  it('publishes the tunnel and the probe echo in step names, which the jobs route returns while the job still runs', () => {
    const tunnel = names.find((name) => name.startsWith('verify-remote tunnel'))!;
    assert.equal(STEP.tunnelPattern.exec(evaluated(tunnel, 'quick-fox.trycloudflare.com'))?.[1], 'quick-fox.trycloudflare.com');
    const probe = names.find((name) => name.startsWith('verify-remote probe'))!;
    assert.equal(STEP.probePattern.exec(evaluated(probe, '0123456789abcdef'))?.[1], '0123456789abcdef');
  });

  it('titles runs and filters trigger branches the way the driver looks for them', () => {
    const request = { owner: '0123456789ab', session: 'iosaaaaaa' };
    assert.match(workflow, /^run-name: verify-remote \$\{\{ inputs\.owner && format\('\{0\}\/\{1\}', inputs\.owner, inputs\.session\) \|\| github\.ref_name \}\}$/m);
    assert.deepEqual(RUN_TITLE.exec(`verify-remote ${request.owner}/${request.session}`)?.slice(1), [request.owner, request.session]);
    assert.match(workflow, /branches: \['verify-remote\/\*\*'\]/);
    assert.ok(triggerBranch(request).startsWith('verify-remote/'));
  });

  it('reads the request on the label the driver sends, and on the free label for a pushed request', () => {
    assert.match(workflow, /^      plan_runner:$/m);
    assert.match(workflow, /^  plan:\n(    #.*\n)*    runs-on: \$\{\{ inputs\.plan_runner \|\| 'ubuntu-latest' \}\}$/m);
  });

  it('names the job that holds the runner `session`, which is how the driver tells its queue from the plan job\'s', () => {
    assert.match(workflow, /^  session:\n    needs: plan$/m);
  });

  it('gives the agent the files and variables it waits on, and uploads nothing', () => {
    for (const needle of ['VERIFY_SESSION_REQUEST', 'VERIFY_SESSION_WORK', 'VERIFY_SESSION_DEVICE_ID', 'VERIFY_SESSION_DEVICE_MODULE', 'VERIFY_SESSION_CLOUDFLARED', '$WORK/tunnel', 'device-ready', '$VERIFY_SESSION_WORK/ended', 'persist-credentials: false']) {
      assert.ok(workflow.includes(needle), needle);
    }
    assert.equal(workflow.includes('upload-artifact'), false, 'a public artifact is where a sign-in ticket could leak');
  });

  it('runs the agent-device the skill pins, installed from its lockfile, and no global one', () => {
    assert.ok(workflow.includes('npm ci --prefix "$SKILL"'));
    const invocations = workflow.split('\n').map((line) => line.trim()).filter((line) => /agent-device"? (--version|prepare)/.test(line));
    assert.equal(invocations.length, 2);
    for (const line of invocations) assert.ok(line.startsWith('"$SKILL/node_modules/.bin/agent-device" '), line);
    assert.doesNotMatch(workflow, /npm (install|i) (-g|--global)/);
  });
});

describe('agent-device calls', () => {
  it('points at the local device with no secret', () => {
    const lease = { backend: 'local', platform: 'ios', deviceId: 'UDID-1' } as LocalLease;
    assert.deepEqual(agentDeviceFor(lease), { selector: ['--platform', 'ios', '--udid', 'UDID-1'], env: {} });
  });

  it('points at a remote daemon and passes the bearer in the environment, registered for redaction', () => {
    const tokenFile = join(mkdtempSync(join(tmpdir(), 'verify-token-')), 'token');
    writeFileSync(tokenFile, 'e'.repeat(64));
    const lease = { backend: 'remote', platform: 'ios', deviceId: 'UDID-2', baseUrl: 'https://x.trycloudflare.com', tokenFile } as RemoteLease;
    const call = agentDeviceFor(lease);
    assert.deepEqual(call.selector, ['--platform', 'ios', '--udid', 'UDID-2', '--daemon-base-url', 'https://x.trycloudflare.com/agent-device']);
    assert.deepEqual(call.env, { AGENT_DEVICE_DAEMON_AUTH_TOKEN: 'e'.repeat(64) });
    assert.ok(usedSecretValues().includes('e'.repeat(64)));
  });
});

describe('choosing between a direct connection and HTTPS_PROXY', () => {
  it('happens in plain JavaScript that imports only Node built-ins, so a Node too old to load TypeScript can still run it and hand over to Node 24', () => {
    const source = readFileSync(join(import.meta.dirname, '..', 'src', 'core', 'launch.mjs'), 'utf8');
    const imported = [...source.matchAll(/\bfrom\s+'([^']+)'/g)].map((match) => match[1]!);
    assert.ok(imported.length > 0);
    assert.deepEqual(imported.filter((specifier) => !specifier.startsWith('node:')), []);
    assert.doesNotMatch(source, /\bimport\s*\(/);
  });

  it('keeps a Mac with a debugging proxy exported on its direct connection', () => {
    assert.equal(chooseEgress({ proxyListens: true, directConnects: true, tokenStatusDirect: null }).proxy, false);
    assert.equal(chooseEgress({ proxyListens: true, directConnects: true, tokenStatusDirect: 200 }).proxy, false);
    assert.equal(chooseEgress({ proxyListens: false, directConnects: true, tokenStatusDirect: null }).proxy, false);
  });

  it('uses the proxy in a sandbox whose token only works through it, although a direct connection opens', () => {
    const choice = chooseEgress({ proxyListens: true, directConnects: true, tokenStatusDirect: 401 });
    assert.equal(choice.proxy, true);
    assert.match(choice.why, /rejects this machine's token on a direct connection/);
  });

  it('uses the proxy when it is the only way out', () => {
    assert.equal(chooseEgress({ proxyListens: true, directConnects: false, tokenStatusDirect: null }).proxy, true);
    assert.equal(chooseEgress({ proxyListens: true, directConnects: true, tokenStatusDirect: 0 }).proxy, true);
  });
});

describe('egress checks', () => {
  async function proxyAnswering(line: string): Promise<{ url: URL; close: () => void }> {
    const server = net.createServer((socket) => socket.once('data', () => socket.end(`${line}\r\n\r\n`)));
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    return { url: new URL(`http://127.0.0.1:${(server.address() as net.AddressInfo).port}`), close: () => server.close() };
  }

  it('reports a refused CONNECT as blocked, with the proxy status line and the fix', async () => {
    const proxy = await proxyAnswering('HTTP/1.1 403 Forbidden');
    try {
      assert.deepEqual(await connectThroughProxy(proxy.url, 'x.trycloudflare.com'), { status: 403, line: 'HTTP/1.1 403 Forbidden' });
      const check = await egressCheck('tunnel-egress', 'x.trycloudflare.com', { HTTPS_PROXY: proxy.url.href, NODE_USE_ENV_PROXY: '1' }, 'allow the host');
      assert.equal(check.ok, false);
      assert.match(check.detail, /^blocked: the proxy at 127\.0\.0\.1:\d+ answered the CONNECT to x\.trycloudflare\.com with "HTTP\/1\.1 403 Forbidden"$/);
      assert.equal(check.fix, 'allow the host');
    } finally {
      proxy.close();
    }
  });

  it('counts only an answer with Cloudflare headers as reached, because a sandbox can answer in the host\'s place', async () => {
    const answering = (status: number, headers: Record<string, string>) => (async () => new Response('', { status, headers })) as typeof fetch;
    const reached = await egressCheck('clerk-egress', 'api.clerk.com', {}, 'allow the host', answering(404, { server: 'cloudflare', 'cf-ray': 'abc' }));
    assert.deepEqual(reached, { id: 'clerk-egress', ok: true, detail: 'reached api.clerk.com: HTTP 404 from cloudflare' });
    const intercepted = await egressCheck('clerk-egress', 'api.clerk.com', {}, 'allow the host', answering(403, {}));
    assert.equal(intercepted.ok, false);
    assert.match(intercepted.detail, /^blocked: api\.clerk\.com answered HTTP 403 without Cloudflare's headers/);
    assert.equal(intercepted.fix, 'allow the host');
  });

  it('says so when the proxy itself is unreachable', async () => {
    assert.equal((await connectThroughProxy(new URL('http://127.0.0.1:9'), 'x.trycloudflare.com')).status, 0);
  });
});

describe('doctor for the remote backend', () => {
  const settings = (): RemoteSettings => ({ platform: 'ios', repo: 'clerk/clerk-ios', workflow: 'verify-remote.yml', sessionsDir: join(mkdtempSync(join(tmpdir(), 'verify-doctor-')), 'remote'), runner: 'paid-mac', planRunner: 'paid-small', plumbingRunner: 'ubuntu-latest', device: 'iPhone Air', idleMinutes: 15, capMinutes: 60, requirement: '' });
  const answer = (status: number, json: unknown = {}, firstRefusalWithToken?: string): ApiResponse => ({ status, json, headers: new Headers(), ...(firstRefusalWithToken === undefined ? {} : { firstRefusalWithToken }) });
  const offline = { HTTPS_PROXY: 'http://127.0.0.1:9', NODE_USE_ENV_PROXY: '1' };
  const git = (pushFails: boolean, remoteTip = 'f'.repeat(40), relation: 'same' | 'behind' | 'unfetched' = 'same') => async (command: string, args: readonly string[]) => {
    if (command === 'git' && args[0] === 'push' && pushFails) {
      return { code: 128, stdout: '', stderr: "remote: the app has no access to this repository\nfatal: unable to access 'https://github.com/clerk/clerk-ios/': The requested URL returned error: 403\n" };
    }
    if (args[0] === 'ls-remote') return { code: 0, stdout: `${remoteTip}\trefs/heads/my-branch\n`, stderr: '' };
    if (args[0] === 'cat-file') return { code: relation === 'unfetched' ? 1 : 0, stdout: '', stderr: '' };
    if (args[0] === 'merge-base') return { code: relation === 'behind' && args[2] === 'HEAD' ? 0 : 1, stdout: '', stderr: '' };
    return { code: 0, stdout: args.includes('--abbrev-ref') ? 'my-branch\n' : 'f'.repeat(40), stderr: '' };
  };

  it('prints every check even when GitHub refuses everything, and says what each skipped check needed', async () => {
    const github: GitHub = { repo: 'clerk/clerk-ios', workflow: 'verify-remote.yml', tokenSource: 'GH_TOKEN', api: async () => answer(401, { message: 'Bad credentials' }) };
    const { device } = await remoteDoctorChecks(settings(), { env: offline, runner: git(true) }, async () => github, { live: true, worktree: '/w', progress: () => undefined });
    const byId = Object.fromEntries(device.map((c) => [c.id, c]));
    for (const id of ['git-fetch', 'git-push', 'github-rest', 'remote-commit', 'remote-trigger', 'remote-channel', 'tunnel-egress', 'clerk-egress', 'live-session', 'live-bearer', 'live-sim-health', 'live-daemon-health', 'live-device', 'live-stop']) {
      assert.ok(byId[id] !== undefined, `${id} is printed`);
    }
    assert.match(byId['git-push']!.detail, /the app has no access to this repository \| fatal: unable to access .* 403/);
    assert.match(byId['git-push']!.fix!, /A 403 on git push means this machine's GitHub credential may not push to the repository/);
    assert.equal(byId['github-rest']!.ok, false);
    assert.equal(byId['remote-trigger']!.detail, 'not run: needs github-rest');
    assert.equal(byId['live-stop']!.detail, 'not run: needs github-rest');
    assert.equal(byId['live-stop']!.state, 'not-run');
  });

  it('with --live, prints live-device as not run when the session never starts, with or without --runner', async () => {
    const neverStarts = (): GitHub => {
      let dispatches = 0;
      let echo = '';
      return {
        repo: 'clerk/clerk-ios',
        workflow: 'verify-remote.yml',
        tokenSource: 'gh',
        api: async (method, path, body) => {
          if (method === 'POST') {
            dispatches += 1;
            if (dispatches > 1) return answer(401, { message: 'Bad credentials' });
            echo = probeEcho(JSON.parse((body as { inputs: { request: string } }).inputs.request) as SessionRequest);
            return answer(200, { workflow_run_id: 7 });
          }
          if (path.startsWith('/actions/runs/7/jobs')) return answer(200, { jobs: [{ name: 'plan', status: 'completed', conclusion: 'success', steps: [{ name: `verify-remote probe ${echo}`, status: 'completed', conclusion: 'success' }] }] });
          if (path === '/actions/runs/7') return answer(200, { status: 'completed', conclusion: 'success', html_url: '' });
          return answer(200, { workflow_runs: [] });
        },
      };
    };
    const live = async (runner?: string) => {
      const { device } = await remoteDoctorChecks(settings(), { env: offline, runner: git(true) }, async () => neverStarts(), { live: true, ...(runner === undefined ? {} : { runner }), worktree: '/w', progress: () => undefined });
      return Object.fromEntries(device.map((c) => [c.id, c]));
    };
    const plain = await live();
    assert.equal(plain['remote-channel']!.ok && plain['remote-channel']!.state === undefined, true, 'the probe ran and its echo was read');
    assert.equal(plain['live-session']!.ok, false);
    assert.equal(plain['live-device']!.detail, 'not run: this session boots no device; --runner <label> names a runner that has one');
    assert.equal(plain['live-stop']!.detail, 'not run: needs live-session');
    assert.equal((await live('some-mac'))['live-device']!.detail, 'not run: needs live-session');
  });

  it('without --live reads only: starts no run, pushes nothing, writes nothing, and says what --live would prove', async () => {
    const calls: string[] = [];
    const github: GitHub = { repo: 'clerk/clerk-ios', workflow: 'verify-remote.yml', tokenSource: 'gh', api: async (method, path) => (calls.push(`${method} ${path}`), answer(200, { workflow_runs: [] })) };
    const reads = git(false);
    const runner: typeof reads = (command, args) => (calls.push(`${command} ${args.join(' ')}`), reads(command, args));
    const progress: string[] = [];
    const s = settings();
    const { device } = await remoteDoctorChecks(s, { env: offline, runner }, async () => github, { live: false, worktree: '/w', progress: (line) => void progress.push(line) });
    assert.deepEqual(calls.filter((call) => call.startsWith('POST') || call.includes('commit-tree') || (call.startsWith('git push') && !call.includes('--dry-run'))), []);
    assert.equal(existsSync(s.sessionsDir), false, 'no owner id is made for a doctor that starts nothing');
    const unrun = ['remote-trigger', 'remote-channel', 'live-session', 'live-sim-health', 'live-bearer', 'live-daemon-health', 'live-device', 'live-stop'];
    assert.deepEqual(device.filter((c) => c.state === 'not-run').map((c) => c.id), unrun);
    for (const c of device.filter((c) => unrun.includes(c.id))) assert.deepEqual([c.ok, c.detail], [true, 'not run: doctor starts no workflow run without --live'], c.id);
    assert.equal(device.find((c) => c.id === 'remote-commit')!.ok, true);
    assert.deepEqual(progress, ['doctor  git and REST reads only: nothing was started or pushed; rerun with --live to start one probe run and one short session, which prove the rest']);
  });

  it('keeps reading a public repository when the token is refused, and says the token is the problem', async () => {
    const github: GitHub = {
      repo: 'clerk/clerk-ios',
      workflow: 'verify-remote.yml',
      tokenSource: 'GH_TOKEN',
      api: async (method, path) => (method === 'POST' ? answer(401, { message: 'Bad credentials' }) : path.includes('/workflows/') ? answer(200, { workflow_runs: [] }) : answer(200, {}, '401 Bad credentials')),
    };
    const { device } = await remoteDoctorChecks(settings(), { env: offline, runner: git(true) }, async () => github, { live: true, worktree: '/w', progress: () => undefined });
    const byId = Object.fromEntries(device.map((c) => [c.id, c]));
    assert.equal(byId['github-rest']!.ok, true);
    assert.match(byId['github-rest']!.detail, /repository 200 without the token \(with it: 401 Bad credentials\).*GitHub refuses this machine's token/);
    assert.equal(byId['remote-commit']!.ok, true);
    assert.equal(byId['remote-trigger']!.ok, false);
    assert.match(byId['remote-trigger']!.detail, /workflow_dispatch was refused \(401 Bad credentials\) and pushing .* failed: the app has no access/);
    assert.match(byId['remote-trigger']!.fix!, /the sandbox's GitHub integration/);
    assert.equal(byId['remote-channel']!.detail, 'not run: needs remote-trigger (no run was started)');
    assert.equal(byId['live-session']!.detail, 'not run: needs remote-trigger');
  });

  it('says when the checkout is behind the remote branch or no longer on it, and how to resync', async () => {
    const github: GitHub = { repo: 'clerk/clerk-ios', workflow: 'verify-remote.yml', tokenSource: 'gh', api: async () => answer(401) };
    const head = async (tip: string, relation: 'same' | 'behind' | 'unfetched') =>
      (await remoteDoctorChecks(settings(), { env: offline, runner: git(false, tip, relation) }, async () => github, { live: false, worktree: '/w', progress: () => undefined })).device.find((c) => c.id === 'git-head')!;
    assert.equal((await head('f'.repeat(40), 'same')).ok, true);
    const behind = await head('a'.repeat(40), 'behind');
    assert.equal(behind.ok, false);
    assert.match(behind.detail, /is behind origin\/my-branch, which is at aaaaaaaaaaaa; this is an old checkout/);
    assert.match(behind.fix!, /^git fetch origin my-branch && git reset --hard FETCH_HEAD/);
    const rewritten = await head('a'.repeat(40), 'unfetched');
    assert.match(rewritten.detail, /is not on origin\/my-branch.*not fetched.*stale or the branch was rewritten/);
  });

  it('with --live, does not push a probe for a HEAD that GitHub does not have', async () => {
    const calls: string[] = [];
    const github: GitHub = { repo: 'clerk/clerk-ios', workflow: 'verify-remote.yml', tokenSource: 'gh', api: async (method, path) => (calls.push(`${method} ${path}`), path.startsWith('/commits/') ? answer(422) : answer(200, { workflow_runs: [] })) };
    const { device } = await remoteDoctorChecks(settings(), { env: offline, runner: git(false) }, async () => github, { live: true, worktree: '/w', progress: () => undefined });
    assert.equal(device.find((c) => c.id === 'remote-trigger')!.detail, 'not run: needs remote-commit (the probe must not push a commit you have not pushed)');
    assert.equal(calls.some((call) => call.startsWith('POST')), false);
  });
});

