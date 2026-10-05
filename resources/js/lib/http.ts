import axios from 'axios';
import { socketId } from '@/lib/realtime';

/**
 * Axios instance for JSON endpoints (chat, notifications menu). Laravel's
 * XSRF-TOKEN cookie is sent automatically by axios.
 */
export const http = axios.create({
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
    },
});

http.interceptors.request.use((config) => {
    const id = socketId();

    if (id) {
        config.headers.set('X-Socket-ID', id);
    }

    return config;
});
