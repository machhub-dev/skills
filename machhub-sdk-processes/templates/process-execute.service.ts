/**
 * ProcessService — invoke MACHHUB Processes from the frontend.
 *
 * Two invocation modes:
 *   1. execute(name, input) — calls any process by its domain-scoped name
 *   2. callEndpoint(slug, body) — calls a process via its HTTP trigger endpoint
 */

const MACHHUB_URL = import.meta.env.VITE_MACHHUB_HTTP_URL ?? 'http://localhost:80';

interface ProcessExecuteRequest {
    name: string;   // format: "domainKey.processName"
    input?: Record<string, unknown>;
}

interface ProcessExecuteResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

class ProcessService {
    private getAuthHeader(): Record<string, string> {
        // Retrieve JWT stored by the SDK/auth service
        const token = localStorage.getItem('machhub_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    /**
     * Execute a process by its domain-scoped name.
     * Works for any trigger type (manual, cron, interval, http, tag_change).
     *
     * @param name - "domainKey.processName" e.g. "myapp.calculateKpi"
     * @param input - Optional input overrides merged with configured inputs
     */
    async execute<T = unknown>(
        name: string,
        input: Record<string, unknown> = {}
    ): Promise<ProcessExecuteResult<T>> {
        const body: ProcessExecuteRequest = { name, input };

        const response = await fetch(`${MACHHUB_URL}/machhub/processes/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeader()
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const text = await response.text();
            return { success: false, error: text || `HTTP ${response.status}` };
        }

        const data = await response.json() as T;
        return { success: true, data };
    }

    /**
     * Call a process via its HTTP trigger endpoint.
     * The process must have an HTTP trigger configured with a matching endpoint slug.
     *
     * @param endpointSlug - The endpoint slug (e.g. "calculate-oee" → POST /process/calculate-oee)
     * @param body - Request body passed to the process as context.trigger.data
     */
    async callEndpoint<T = unknown>(
        endpointSlug: string,
        body: Record<string, unknown> = {}
    ): Promise<ProcessExecuteResult<T>> {
        const response = await fetch(`${MACHHUB_URL}/process/${endpointSlug}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const text = await response.text();
            return { success: false, error: text || `HTTP ${response.status}` };
        }

        const data = await response.json() as T;
        return { success: true, data };
    }
}

export const processService = new ProcessService();

// ---------------------------------------------------------------------------
// Usage examples
// ---------------------------------------------------------------------------

// 1. Execute any process by name
const kpiResult = await processService.execute<{ oee: number; }>('myapp.calculateKpi', {
    line: 'line1',
    date: '2026-03-26'
});
if (kpiResult.success) {
    console.log('OEE:', kpiResult.data?.oee);
}

// 2. Call an HTTP-triggered process endpoint
const reportResult = await processService.callEndpoint<{ reportUrl: string; }>('generate-report', {
    type: 'daily',
    format: 'pdf'
});
if (reportResult.success) {
    console.log('Report URL:', reportResult.data?.reportUrl);
}
