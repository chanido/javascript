# Remote devices

A machine that is not a Mac cannot run an iOS simulator, and a machine with no hardware virtualization cannot run the Android emulator. There the CLI starts a job on a GitHub Actions runner through `.github/workflows/verify-remote.yml`. The job boots a simulator or an emulator, builds the fixture, and opens a tunnel, and the CLI drives the device through that tunnel. The job is called a session.

## What the machine needs

- Node 24. On any other Node major, the CLI reruns itself under `node@24` through `npx` and prints a `note` line that says so. `npm ci --prefix .claude/skills/verify-clerk-expo` runs once per worktree. The machine needs no Xcode, no Android Studio, and no `pnpm install`, because the runner builds the app.
- A GitHub token in `GH_TOKEN` or `GITHUB_TOKEN`, or a logged-in `gh`. The token must be able to read the repository over REST.
- Permission to dispatch `verify-remote.yml`, or permission to push a branch named `verify-remote/*`. The CLI tries the dispatch first. If GitHub refuses it, the CLI pushes a branch of that name that holds the request, and the workflow deletes the branch.
- Permission to `git push` your own branch, if you want to verify a commit that you make on this machine. Without it you can still verify commits that GitHub already has.
- Network access to `api.github.com`, `*.trycloudflare.com`, `api.clerk.com`, `api.clerk.dev`, and `*.clerk.accounts.dev`.
- A Clerk Platform API credential. In a cloud environment, add an API credential for `api.clerk.com` with path prefix `/v1/platform/`. The environment then adds the key after a request leaves the machine, and no key is ever in the session.

`doctor` checks each of these and prints the fix. `doctor --live` then proves the path end to end, as `SKILL.md` describes under Doctor.

## What a session builds

A session builds a commit that GitHub has, never your working tree. It runs `node src/fixture.ts <platform>` on the runner, which is the same module the local build calls. The result is a standalone app: a Release build with `expo-dev-client` left out and the JS embedded, so the device needs no Metro.

The build key of a local dev client covers the native inputs only. The build key of a standalone app also covers everything the JS bundle is made from: `.npmrc`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `turbo.json`, `packages/clerk-js`, `packages/expo`, `packages/expo-biometrics`, `packages/expo-google-signin`, `packages/react`, `packages/shared`, and `integration/templates/expo-native`. `up` and `run` fail with `BUILD_FAILED` when one of those paths has uncommitted changes or when GitHub does not have HEAD, and the fix is to commit and push.

After you push an edit to one of those paths, `run` asks the same session to build the new commit. The session keeps its generated native project while the native inputs are unchanged, so a JS edit skips `pnpm add`, `expo install`, and `expo prebuild --clean`. Specs run from your working tree, so an edit to a spec needs no commit. A session that already holds the build for your commit is reused as it is.

On Android the standalone build runs the JS bundle task again on every build (`:app:createBundleReleaseJsAndAssets --rerun` in `src/fixture.ts`). Gradle judges that task up to date when the only change is inside a linked workspace package, and without the rerun a session reported a rebuild and kept the old JS. Xcode runs its bundle phase on every build.

A session keeps the code under `src/core/` from the commit it started on. When `src/core/MANIFEST` in your checkout differs from the one the session started on, `up` and `run` fail with `NOT_READY`. The fix is to commit and push the change, then `down`, then `up`. The session reads `src/fixture.ts` and `src/platform/session-device.ts` again from each commit it builds. The build key leaves out everything under `.claude/`, so a commit that changes only those two files does not make a held session rebuild. After such a commit, run `down`, then `up`.

## Runners

| Platform | Default label                  | Device                                                                               |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| iOS      | `blacksmith-6vcpu-macos-26`    | An `iPhone 17 Pro` that `integration/tests/expo-native/boot-ios-simulators.sh` makes |
| Android  | `blacksmith-8vcpu-ubuntu-2204` | The `Clerk_Verify_Pixel` AVD, booted by the skill's own Android lane code            |

Both labels are billed by the minute, and `REMOTE_DEVICE` in `src/host.ts` holds them. `--runner <label>` on `up` or `run`, or `VERIFY_REMOTE_RUNNER=<label>`, uses another label. A held session keeps its label, and `--runner` with another label fails until `down`. A remote device is not a lane, so the lane pool and `--wait` do not apply to it.

Before the session's runner starts, a job of a few seconds reads the request. For a session on a Blacksmith label, that job runs on `blacksmith-8vcpu-ubuntu-2204`, so the session does not first wait in the queue for GitHub's own runners. For a session on a GitHub-hosted label it runs on `ubuntu-latest`, and so do the probe run and the session of `doctor --live`. A run that the CLI starts by pushing a branch reads its request on `ubuntu-latest`, whatever the session's label. `VERIFY_REMOTE_PLAN_RUNNER=<label>` names another label for a run that the CLI dispatches. While a run has not published its tunnel, the CLI prints a `wait` line that names the label it is waiting for and for how long:

```console
wait    run <run> has waited 0s, now for a blacksmith-8vcpu-ubuntu-2204 runner to read its request
wait    run <run> has waited 19s, now for a blacksmith-6vcpu-macos-26 runner
wait    run <run> has waited 37s, now for the tunnel on blacksmith-6vcpu-macos-26
```

The app build decides how long `up` takes, because the device boots while the app builds. Measured once for each platform, on a branch with no caches: `up` was ready in 423 s on iOS, of which the build took 360 s, and in 335 s on Android, of which the build took 288 s. Run `up` right after you push.

## Session lifetime

A session stops itself after 15 minutes without a call from the CLI, and always 60 minutes after it started. `VERIFY_REMOTE_IDLE_MINUTES` (1 to 120) and `VERIFY_REMOTE_CAP_MINUTES` (2 to 360) change the limits for sessions you start. `down` stops the session at once and waits for the runner job to finish.

After an idle stop, the next `up` or `run` prints a `lost` line that ends in `renewing` and starts a new session. A session with under two minutes left before its cap is replaced the same way, with an `ending` line.

Each checkout has a random id in `.verify/remote/owner`, and its sessions carry that id. When the checkout holds no lease, `up` and `run` end any session with that id that is still running, and `down --stale` does so at any time. The idle stop ends whatever they miss, such as the session of a checkout that was deleted.

## Network and proxy

Node ignores `HTTPS_PROXY` unless it is told to honor it, so the CLI decides. It goes through the proxy when the direct path to GitHub does not work, which means that it cannot connect or that GitHub rejects the machine's token on it. In that case the CLI reruns itself with the proxy in effect for itself, e2e, and agent-device. A machine that reaches GitHub directly stays direct. `doctor` prints the choice and the reason in `remote-env`.

A host that the environment blocks shows in `doctor` as `blocked:` and what answered. The fix is to add the host to the allowed domains of the environment that the CLI runs in.

## GitHub access

A session uses GitHub in two ways. REST starts, reads, and ends sessions. `git push` gets a commit that you make to GitHub, so that the session can build it.

Claude Code cloud sessions are one example of a sandbox where the two differ. REST there uses the session user's own access. `git push` needs the Claude GitHub App installed on the repository, and a 403 on push means that it is not. The sandbox's `GH_TOKEN` is a placeholder that only the sandbox's proxy turns into a real credential, which is the case above where GitHub rejects the token on a direct connection.

## What each party can see

The runner and the tunnel never get the Platform API key or the instance's secret key. The CLI sends those keys only to Clerk. In a cloud environment that attaches the Platform API key itself, the key never enters the machine.

The CLI makes the session's bearer token on this machine and keeps it in `.verify/remote/<session>/token`. `down` deletes the file. Never print it. GitHub sees only the SHA-256 of the token, in the request.

The runner sees sign-in tickets and the publishable key as launch arguments. The workflow uploads no artifact. The video is recorded on the runner and downloaded through the tunnel into the run directory.

The tunnel is a Cloudflare quick tunnel. It ends TLS at Cloudflare, so Cloudflare can read what passes through it, the bearer and the tickets included. The tunnel's host name is public for the life of the session, and every route on it answers 403 without the bearer.

## The Backend API host in a cloud environment

The Backend API calls that seed users use the instance's own secret key on `api.clerk.com`. A cloud API credential with path prefix `/v1/platform/` is attached to Platform API calls only, so those calls keep the instance's own key. A cloud API credential with no path prefix replaces that key on every request to the host, and the call gets 401. The CLI then sends the same request to `api.clerk.dev`, another name of the same API, and stays there for the rest of the command if that succeeds. `up` prints `clerk   Backend API on <host>`, and the `clerk-api` check of `doctor` names the host too.

## Not tried

- The four `form-entry` specs on a remote device.
- The idle stop, the cap, and the cleanup of an abandoned session with this repository's workflow. They are code that the three skills share, and they were observed in clerk-ios and clerk-android.
- A GitHub-hosted label as the session's runner.
- A rebuild on a held session after a change to a native input, or after a change inside `@clerk/clerk-js` or `@clerk/shared`.
- A compile error on the runner.
