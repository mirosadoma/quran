import { useEffect, useState } from 'react';

export interface Countdown {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    done: boolean;
}

function compute(target: number): Countdown {
    const totalSeconds = Math.max(0, Math.floor((target - Date.now()) / 1000));

    return {
        days: Math.floor(totalSeconds / 86_400),
        hours: Math.floor((totalSeconds % 86_400) / 3_600),
        minutes: Math.floor((totalSeconds % 3_600) / 60),
        seconds: totalSeconds % 60,
        totalSeconds,
        done: totalSeconds === 0,
    };
}

/**
 * Time remaining until the given ISO date, updated every second.
 */
export function useCountdown(target: string | null | undefined): Countdown {
    const time = target ? new Date(target).getTime() : Date.now();
    const [state, setState] = useState(() => compute(time));

    useEffect(() => {
        setState(compute(time));

        const timer = window.setInterval(() => setState(compute(time)), 1000);

        return () => window.clearInterval(timer);
    }, [time]);

    return state;
}
