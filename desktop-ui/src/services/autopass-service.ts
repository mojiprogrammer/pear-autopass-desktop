
import type {
    Entry,
    EntryAction,
    WorkerMessage
} from '../types/entry';

const WORKER_PATH = '/workers/autopass-service.js';

interface WorkerBridge
{
    startWorker: (specifier: string) => Promise<boolean> | boolean;

    writeWorkerIPC: (
        specifier: string,
        data: string,
    ) => Promise<unknown> | unknown;

    onWorkerIPC: (
        specifier: string,
        callback: (data: unknown) => void,
    ) => (() => void) | void;

    onWorkerStdout?: (
        specifier: string,
        callback: (data: unknown) => void,
    ) => (() => void) | void;

    onWorkerStderr?: (
        specifier: string,
        callback: (data: unknown) => void,
    ) => (() => void) | void;

    onWorkerExit?: (
        specifier: string,
        callback: (data: unknown) => void,
    ) => (() => void) | void;
}

declare global
{
    interface Window
    {
        bridge?: WorkerBridge;
        autopassAPI?: AutopassAPI;
    }
}

export interface AutopassAPI
{
    ready: Promise<Entry[]>;
    list: () => Promise<Entry[]>;
    get: (key: string) => Promise<Entry | null>;
    add: (key: string, value: string) => Promise<unknown>;
    update: (key: string, value: string) => Promise<unknown>;
    remove: (key: string) => Promise<unknown>;
    onEntriesUpdated: (callback: (entries: Entry[]) => void) => () => void;
}

interface PendingRequest
{
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
}

interface IPCResponse
{
    type: 'response';
    id: string;
    success?: boolean;
    result?: unknown;
    error?: string;
}

const pendingRequests = new Map<string, PendingRequest>();
const entriesListeners = new Set<(entries: Entry[]) => void>();

let requestCounter = 0;
let workerStarted = false;
let startupPromise: Promise<Entry[]> | undefined;
let unsubscribeIPC: (() => void) | undefined;

function parseMessage(data: unknown): WorkerMessage | null
{
    try
    {
        const raw =
            typeof data === 'string'
                ? data
                : data instanceof Uint8Array
                    ? new TextDecoder().decode(data)
                    : null;

        if (!raw) return null;

        const parsed: unknown = JSON.parse(raw);

        if (typeof parsed !== 'object' || parsed === null || !('type' in parsed))
        {
            return null;
        }

        return parsed as WorkerMessage;
    } catch
    {
        return null;
    }
}

function dispatchEntries(entries: Entry[]): void
{
    for (const callback of entriesListeners)
    {
        callback(entries);
    }
}

function request<T>(
    action: EntryAction,
    payload?: unknown,
): Promise<T>
{
    const bridge = window.bridge;

    if (!bridge)
    {
        return Promise.reject(
            new Error("Desktop worker bridge is unavailable."),
        );
    }

    const id = `request-${ ++requestCounter }`;

    return new Promise<T>((resolve, reject) =>
    {
        const timeout = setTimeout(() =>
        {
            pendingRequests.delete(id);

            reject(
                new Error(
                    `Worker request "${ action }" timed out after 10 seconds.`,
                ),
            );
        }, 10_000);

        pendingRequests.set(id, {
            resolve: (value) =>
            {
                clearTimeout(timeout);
                resolve(value as T);
            },
            reject: (error) =>
            {
                clearTimeout(timeout);
                reject(error);
            },
            timeout,
        });

        try
        {
            bridge.writeWorkerIPC(
                WORKER_PATH,
                JSON.stringify({ id, action, payload }),
            );
        } catch (error)
        {
            pendingRequests.delete(id);
            clearTimeout(timeout);

            reject(
                error instanceof Error
                    ? error
                    : new Error("Failed to send a worker request."),
            );
        }
    });
}

function handleIPC(data: unknown): void
{
    const message = parseMessage(data);
    if (!message) return;

    if (message.type === 'response')
    {
        const response = message as IPCResponse;
        const pending = pendingRequests.get(response.id);

        if (!pending) return;

        pendingRequests.delete(response.id);

        if (response.error || response.success === false)
        {
            pending.reject(new Error(response.error || 'Worker request failed.'));
        } else
        {
            pending.resolve(response.result);
        }

        return;
    }

    if (message.type === 'entries-updated')
    {
        void request<Entry[]>('list')
            .then(dispatchEntries)
            .catch((error: unknown) =>
            {
                console.error('Failed to refresh entries after worker update:', error);
            });
    }
}

function startWorker(): void
{
    const bridge = window.bridge;

    if (!bridge)
    {
        throw new Error('Desktop worker bridge is unavailable.');
    }

    if (workerStarted) return;

    // Register listeners using the exact worker specifier.
    unsubscribeIPC =
        bridge.onWorkerIPC(WORKER_PATH, (data) =>
        {
            handleIPC(data);
        }) || undefined;

    bridge.onWorkerStderr?.(WORKER_PATH, (data) =>
    {
        console.error('[Autopass worker stderr]', data);
    });

    bridge.onWorkerStdout?.(WORKER_PATH, (data) =>
    {
        console.log('[Autopass worker stdout]', data);
    });

    bridge.onWorkerExit?.(WORKER_PATH, (data) =>
    {
        workerStarted = false;

        const error = new Error(
            `Autopass worker exited: ${ String(data) }`,
        );

        for (const pending of pendingRequests.values())
        {
            pending.reject(error);
        }

        pendingRequests.clear();
    });

    // Start the worker only after registering its listeners.
    workerStarted = true;

    try
    {
        bridge.startWorker(WORKER_PATH);
    } catch (error)
    {
        workerStarted = false;
        unsubscribeIPC?.();
        unsubscribeIPC = undefined;

        throw error instanceof Error
            ? error
            : new Error('Failed to start the Autopass worker.');
    }
}

function list(): Promise<Entry[]>
{
    return request<Entry[]>('list');
}

function get(key: string): Promise<Entry | null>
{
    return request<Entry | null>('get', { key });
}

function add(key: string, value: string): Promise<unknown>
{
    return request('add', { key, value });
}

function update(key: string, value: string): Promise<unknown>
{
    return request('update', { key, value });
}

function remove(key: string): Promise<unknown>
{
    return request('remove', { key });
}

function onEntriesUpdated(
    callback: (entries: Entry[]) => void,
): () => void
{
    entriesListeners.add(callback);

    return () =>
    {
        entriesListeners.delete(callback);
    };
}

function initialize(): Promise<Entry[]>
{
    if (!startupPromise)
    {
        try
        {
            startWorker();
            startupPromise = list();
        } catch (error)
        {
            startupPromise = Promise.reject(
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    return startupPromise;
}

const api: AutopassAPI = {
    get ready()
    {
        return initialize();
    },
    list,
    get,
    add,
    update,
    remove,
    onEntriesUpdated,
};

// Keep compatibility with existing code that accesses window.autopassAPI.
window.autopassAPI = api;

export { add, get, initialize, list, onEntriesUpdated, remove, update };
export default api;
