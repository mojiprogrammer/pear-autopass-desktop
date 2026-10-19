
import { useCallback, useEffect, useState } from 'react';

import
{
    add as addEntry,
    initialize,
    list,
    onEntriesUpdated,
    remove as removeEntry,
    update as updateEntry,
} from '../services/autopass-service';

import type { Entry } from '../types/entry';

interface UseEntriesResult
{
    entries: Entry[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    add: (key: string, value: string) => Promise<void>;
    update: (key: string, value: string) => Promise<void>;
    remove: (key: string) => Promise<void>;
}

type AsyncOperation = () => Promise<void>;

const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred.';

function getErrorMessage(error: unknown): string
{
    return error instanceof Error
        ? error.message
        : DEFAULT_ERROR_MESSAGE;
}

export function useEntries(): UseEntriesResult
{
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async (): Promise<void> =>
    {
        try
        {
            setError(null);

            const updatedEntries = await list();
            setEntries(updatedEntries);
        } catch (err: unknown)
        {
            setError(getErrorMessage(err));
            throw err;
        }
    }, []);

    useEffect(() =>
    {
        let active = true;

        const unsubscribe = onEntriesUpdated((updatedEntries) =>
        {
            if (!active)
            {
                return;
            }

            setEntries(updatedEntries);
            setError(null);
        });

        async function loadEntries(): Promise<void>
        {
            setLoading(true);

            try
            {
                const initialEntries = await initialize();

                if (!active)
                {
                    return;
                }

                setEntries(initialEntries);
                setError(null);
            } catch (err: unknown)
            {
                if (active)
                {
                    setError(getErrorMessage(err));
                }
            } finally
            {
                if (active)
                {
                    setLoading(false);
                }
            }
        }

        void loadEntries();

        return () =>
        {
            active = false;
            unsubscribe();
        };
    }, []);

    const runMutation = useCallback(
        async (operation: AsyncOperation): Promise<void> =>
        {
            setError(null);

            try
            {
                await operation();
            } catch (err: unknown)
            {
                setError(getErrorMessage(err));
                throw err;
            }
        },
        [],
    );

    const add = useCallback(
        (key: string, value: string): Promise<void> =>
            runMutation(async () =>
            {
                await addEntry(key, value);
                await refresh();
            }),
        [refresh, runMutation],
    );

    const update = useCallback(
        (key: string, value: string): Promise<void> =>
            runMutation(async () =>
            {
                await updateEntry(key, value);
                await refresh();
            }),
        [refresh, runMutation],
    );

    const remove = useCallback(
        (key: string): Promise<void> =>
            runMutation(async () =>
            {
                await removeEntry(key);
                await refresh();
            }),
        [refresh, runMutation],
    );

    return {
        entries,
        loading,
        error,
        refresh,
        add,
        update,
        remove,
    };
}

export default useEntries;
