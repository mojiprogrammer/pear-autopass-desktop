
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

function getErrorMessage(error: unknown): string
{
    return error instanceof Error
        ? error.message
        : 'An unexpected error occurred.';
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

            const result = await list();
            setEntries(result);
        } catch (err)
        {
            const message = getErrorMessage(err);
            setError(message);
            throw err;
        }
    }, []);

    useEffect(() =>
    {
        let active = true;

        const unsubscribe = onEntriesUpdated((updatedEntries) =>
        {
            if (active)
            {
                setEntries(updatedEntries);
                setError(null);
            }
        });

        async function loadEntries(): Promise<void>
        {
            setLoading(true);

            try
            {
                const initialEntries = await initialize();

                if (active)
                {
                    setEntries(initialEntries);
                    setError(null);
                }
            } catch (err)
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

    const add = useCallback(
        async (key: string, value: string): Promise<void> =>
        {
            setError(null);

            try
            {
                await addEntry(key, value);
                await refresh();
            } catch (err)
            {
                setError(getErrorMessage(err));
                throw err;
            }
        },
        [refresh],
    );

    const update = useCallback(
        async (key: string, value: string): Promise<void> =>
        {
            setError(null);

            try
            {
                await updateEntry(key, value);
                await refresh();
            } catch (err)
            {
                setError(getErrorMessage(err));
                throw err;
            }
        },
        [refresh],
    );

    const remove = useCallback(
        async (key: string): Promise<void> =>
        {
            setError(null);

            try
            {
                await removeEntry(key);
                await refresh();
            } catch (err)
            {
                setError(getErrorMessage(err));
                throw err;
            }
        },
        [refresh],
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
