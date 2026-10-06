/**
 * The settings of the Laravel app one folder up (.env), for the TRANSCRIBER_* variables: imported first,
 * so every module sees them. Variables already in the environment win over the file.
 */

import { fileURLToPath } from 'node:url';

try {
    process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch {
    // No .env next to the service: the environment and the defaults are used.
}
