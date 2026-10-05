import { useEffect, useRef } from 'react';
import { onRealtime, type RealtimeEvent } from '@/lib/realtime';

/**
 * Run the handler whenever the realtime event is received.
 */
export function useRealtime<T>(event: RealtimeEvent, handler: (payload: T) => void): void {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => onRealtime(event, (payload: never) => handlerRef.current(payload as T)), [event]);
}
