/**
 * Call MACHHUB Processes from a frontend app.
 *
 * Always go through the SDK: it targets the right host, and it sends the
 * logged-in user's token. Don't fetch /machhub/processes/execute or
 * /process/<endpoint> by hand. The HTTP-trigger endpoint needs an API key and
 * is meant for external callers, not browser apps.
 */
import { getSDK } from '$lib/machhub/sdk'; // see machhub-sdk-initialization

/**
 * Run a process by name. Works whatever its triggers are.
 * `input` keys override the process's configured inputs.
 * Resolves to the process's return value. Outputs (SQL / tag writes) run
 * afterwards in the background.
 */
export async function runProcess<T = unknown>(name: string, input: Record<string, unknown> = {}): Promise<T> {
    const sdk = await getSDK();
    return (await sdk.processes.execute(name, input)) as T;
}

// Usage:
// const oee = await runProcess<{ availability: number; performance: number; quality: number }>(
//     'calculateOEE',
//     { line: 'Line1', shift: 'A' }
// );
