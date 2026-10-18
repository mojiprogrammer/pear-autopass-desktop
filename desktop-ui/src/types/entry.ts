
export interface Entry
{
    key: string;
    value: string;
    file?: string;
}

export interface EntryInput
{
    key: string;
    value: string;
}

export type EntryAction = 'list' | 'get' | 'add' | 'update' | 'remove';

export interface WorkerRequest<TPayload = unknown>
{
    id: string;
    action: EntryAction;
    payload?: TPayload;
}

export interface WorkerResponse<TData = unknown>
{
    type: 'response';
    id: string;
    success?: boolean;
    result?: TData;
    error?: string;
}

export interface WorkerReadyMessage
{
    type: 'ready';
}

export interface EntriesUpdatedMessage
{
    type: 'entries-updated';
}

export type WorkerMessage =
    | WorkerResponse
    | WorkerReadyMessage
    | EntriesUpdatedMessage;
