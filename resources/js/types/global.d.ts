import type { route as routeFn } from 'ziggy-js';
import type { FlashData, SharedProps } from './index';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: SharedProps;
        flashDataType: FlashData;
    }
}

declare global {
    var route: typeof routeFn;

    interface Window {
        Pusher: unknown;
    }
}

export {};
