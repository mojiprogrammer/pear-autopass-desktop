
import type {
    Entry,
    EntryAction,
    WorkerMessage,
} from '../types/entry';

const WORKER_PATH = '/workers/autopass-service.js';
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred.';

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
    onEntriesUpdated: (
        callback: (entries: Entry[]) => void,
    ) => () => void;
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

type Unsubscribe = () => void;

const pendingRequests = new Map<string, PendingRequest>();
const entriesListeners = new Set<(entries: Entry[]) => void>();
const workerListenerCleanup: Unsubscribe[] = [];

let requestCounter = 0;
let workerStarted = false;
let startupPromise: Promise<Entry[]> | undefined;

function getErrorMessage(error: unknown): string
{
    return error instanceof Error
        ? error.message
        : DEFAULT_ERROR_MESSAGE;
}

function toError(error: unknown, fallback: string): Error
{
    return error instanceof Error
        ? error
        : new Error(fallback);
}

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

        if (!raw)
        {
            return null;
        }

        const parsed: unknown = JSON.parse(raw);

        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            !('type' in parsed) ||
            typeof parsed.type !== 'string'
        )
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
        try
        {
            callback(entries);
        } catch (error: unknown)
        {
            console.error(
                'An entries-updated listener failed:',
                error,
            );
        }
    }
}

function cleanupWorkerListeners(): void
{
    while (workerListenerCleanup.length > 0)
    {
        const unsubscribe = workerListenerCleanup.pop();

        try
        {
            unsubscribe?.();
        } catch (error: unknown)
        {
            console.error(
                'Failed to remove a worker listener:',
                error,
            );
        }
    }
}

function rejectPendingRequests(error: Error): void
{
    for (const pending of pendingRequests.values())
    {
        pending.reject(error);
    }

    pendingRequests.clear();
}

function handleWorkerExit(data: unknown): void
{
    workerStarted = false;
    startupPromise = undefined;

    cleanupWorkerListeners();

    rejectPendingRequests(
        new Error(`Autopass worker exited: ${ String(data) }`),
    );
}

function handleIPC(data: unknown): void
{
    const message = parseMessage(data);

    if (!message)
    {
        console.warn('Ignoring an invalid Autopass worker message.');
        return;
    }

    if (message.type === 'response')
    {
        const response = message as IPCResponse;
        const pending = pendingRequests.get(response.id);

        if (!pending)
        {
            return;
        }

        pendingRequests.delete(response.id);

        if (response.error || response.success === false)
        {
            pending.reject(
                new Error(response.error || 'Worker request failed.'),
            );
            return;
        }

        pending.resolve(response.result);
        return;
    }

    if (message.type === 'entries-updated')
    {
        void list()
            .then(dispatchEntries)
            .catch((error: unknown) =>
            {
                console.error(
                    'Failed to refresh entries after a worker update:',
                    error,
                );
            });
    }
}

async function startWorker(): Promise<void>
{
    const bridge = window.bridge;

    if (!bridge)
    {
        throw new Error('Desktop worker bridge is unavailable.');
    }

    if (workerStarted)
    {
        return;
    }

    cleanupWorkerListeners();

    const unsubscribeIPC = bridge.onWorkerIPC(
        WORKER_PATH,
        handleIPC,
    );

    if (unsubscribeIPC)
    {
        workerListenerCleanup.push(unsubscribeIPC);
    }

    const unsubscribeStdout = bridge.onWorkerStdout?.(
        WORKER_PATH,
        (data) =>
        {
            console.debug('[Autopass worker]', data);
        },
    );

    if (unsubscribeStdout)
    {
        workerListenerCleanup.push(unsubscribeStdout);
    }

    const unsubscribeStderr = bridge.onWorkerStderr?.(
        WORKER_PATH,
        (data) =>
        {
            console.error('[Autopass worker stderr]', data);
        },
    );

    if (unsubscribeStderr)
    {
        workerListenerCleanup.push(unsubscribeStderr);
    }

    const unsubscribeExit = bridge.onWorkerExit?.(
        WORKER_PATH,
        handleWorkerExit,
    );

    if (unsubscribeExit)
    {
        workerListenerCleanup.push(unsubscribeExit);
    }

    try
    {
        const started = await bridge.startWorker(WORKER_PATH);

        if (started === false)
        {
            throw new Error('Failed to start the Autopass worker.');
        }

        workerStarted = true;
    } catch (error: unknown)
    {
        workerStarted = false;
        cleanupWorkerListeners();

        throw toError(
            error,
            'Failed to start the Autopass worker.',
        );
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
            new Error('Desktop worker bridge is unavailable.'),
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
                    `Worker request "${ action }" timed out after ` +
                    `${ REQUEST_TIMEOUT_MS / 1000 } seconds.`,
                ),
            );
        }, REQUEST_TIMEOUT_MS);

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
            const writeResult = bridge.writeWorkerIPC(
                WORKER_PATH,
                JSON.stringify({ id, action, payload }),
            );

            void Promise.resolve(writeResult).catch(
                (error: unknown) =>
                {
                    const pending = pendingRequests.get(id);

                    if (!pending)
                    {
                        return;
                    }

                    pendingRequests.delete(id);
                    pending.reject(
                        toError(
                            error,
                            'Failed to send a worker request.',
                        ),
                    );
                },
            );
        } catch (error: unknown)
        {
            const pending = pendingRequests.get(id);

            if (pending)
            {
                pendingRequests.delete(id);
                pending.reject(
                    toError(
                        error,
                        'Failed to send a worker request.',
                    ),
                );
            }
        }
    });
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
): Unsubscribe
{
    entriesListeners.add(callback);

    return () =>
    {
        entriesListeners.delete(callback);
    };
}

function initialize(): Promise<Entry[]>
{
    if (startupPromise)
    {
        return startupPromise;
    }

    const startup = (async (): Promise<Entry[]> =>
    {
        await startWorker();
        return list();
    })();

    startupPromise = startup;

    void startup.catch(() =>
    {
        if (startupPromise === startup)
        {
            startupPromise = undefined;
        }
    });

    return startup;
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

window.autopassAPI = api;

export
{
    add,
    get,
    initialize,
    list,
    onEntriesUpdated,
    remove,
    update
};

export default api;
