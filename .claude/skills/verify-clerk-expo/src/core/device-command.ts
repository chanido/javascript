import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { run, type ExecResult, type Runner } from './exec.ts';
import { DEVICE_COMMAND_LIMITS, deviceToolCommand, type DeviceCommandResult } from './remote/protocol.ts';
import { sessionCall } from './remote/session.ts';
import { VerifyFailure, type Lease } from './types.ts';

function localAdb(env: Readonly<Record<string, string | undefined>>): string {
  const root = env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT;
  const inSdk = root === undefined ? '' : join(root, 'platform-tools', 'adb');
  return inSdk !== '' && existsSync(inSdk) ? inSdk : 'adb';
}

export async function deviceCommand(lease: Lease, args: readonly string[], options: { readonly runner?: Runner; readonly env?: Readonly<Record<string, string | undefined>> } = {}): Promise<ExecResult> {
  const local = deviceToolCommand(lease.platform, lease.deviceId, args, localAdb(options.env ?? process.env));
  if (local === null) throw new VerifyFailure('UNSUPPORTED', `no ${lease.platform} device command starts with ${args[0] ?? 'nothing'}`, 'on Android use adb shell or adb reverse arguments; on iOS pass what the app needs as launch arguments');
  if (lease.backend === 'local') return (options.runner ?? run)(local.command, local.args);
  const response = await sessionCall(lease, '/__sim/device-command', { method: 'POST', json: { args }, timeoutMs: DEVICE_COMMAND_LIMITS.timeoutMs + 15_000 });
  if (response.status !== 200) {
    throw new VerifyFailure('NOT_READY', `the session did not run the device command ${args[0]}: ${response.status} ${(await response.text()).slice(0, 300)}`, '{cli} doctor');
  }
  return (await response.json()) as DeviceCommandResult;
}
