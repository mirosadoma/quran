<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Meeting Provider
    |--------------------------------------------------------------------------
    |
    | Supported: "google_meet", "zoom", "jitsi", "manual". The admin can
    | override this from the settings page, and every halaqa can pick
    | its own provider.
    |
    */

    'default' => env('MEETING_PROVIDER', 'jitsi'),

    /*
    |--------------------------------------------------------------------------
    | Join Windows
    |--------------------------------------------------------------------------
    |
    | Students may join a session this many minutes before it starts, and
    | teachers may start it this many minutes early.
    |
    */

    'student_join_before_minutes' => 15,

    'teacher_start_before_minutes' => 60,

    /*
    |--------------------------------------------------------------------------
    | Recordings
    |--------------------------------------------------------------------------
    */

    'recordings_disk' => env('RECORDINGS_DISK', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Jitsi
    |--------------------------------------------------------------------------
    |
    | "public"      => meet.jit.si, opened in a new tab (embedding is limited
    |                  to 5 minutes there). Works without any setup.
    | "jaas"        => 8x8 Jitsi as a Service, embedded inside the platform.
    | "self_hosted" => your own Jitsi server, embedded inside the platform.
    |
    */

    'jitsi' => [
        'mode' => env('JITSI_MODE', 'public'),
        'domain' => env('JITSI_DOMAIN', 'meet.jit.si'),
        'app_id' => env('JITSI_APP_ID'),
        'app_secret' => env('JITSI_APP_SECRET'),

        'jaas' => [
            'app_id' => env('JAAS_APP_ID'),
            'api_key_id' => env('JAAS_API_KEY_ID'),
            'private_key_path' => env('JAAS_PRIVATE_KEY_PATH', 'storage/app/private/jaas.pem'),
            'webhook_secret' => env('JAAS_WEBHOOK_SECRET'),
        ],
    ],

];
