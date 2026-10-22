<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    /*
     * Push notifications on phones and desktops, sent through Firebase Cloud Messaging.
     * From the Firebase console (Project settings):
     * - credentials: Service accounts > Generate new private key (a secret JSON file, keep it out of git).
     * - api_key, app_id, messaging_sender_id: General > Your apps > the web app (firebaseConfig).
     * - vapid_key: Cloud Messaging > Web Push certificates > the key pair (public).
     */
    'firebase' => [
        'credentials' => env('FIREBASE_CREDENTIALS', storage_path('app/private/firebase-credentials.json')),
        'api_key' => env('FIREBASE_API_KEY'),
        'app_id' => env('FIREBASE_APP_ID'),
        'messaging_sender_id' => env('FIREBASE_MESSAGING_SENDER_ID'),
        'vapid_key' => env('FIREBASE_VAPID_KEY'),
    ],

    'zoom' => [
        'account_id' => env('ZOOM_ACCOUNT_ID'),
        'client_id' => env('ZOOM_CLIENT_ID'),
        'client_secret' => env('ZOOM_CLIENT_SECRET'),
        'webhook_secret' => env('ZOOM_WEBHOOK_SECRET'),
    ],

    'whatsapp' => [
        'driver' => env('WHATSAPP_DRIVER', 'log'),
        'token' => env('WHATSAPP_TOKEN'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'api_version' => env('WHATSAPP_API_VERSION', 'v21.0'),
        'template_language' => env('WHATSAPP_TEMPLATE_LANGUAGE', 'ar'),
        'default_country_code' => env('WHATSAPP_DEFAULT_COUNTRY_CODE', '20'),

        /*
         * Approved Meta message templates used for business-initiated messages.
         * Each template must contain a single body variable {{1}} that receives
         * the notification text. Leave a value empty to send plain text instead
         * (only delivered inside the 24-hour customer service window).
         */
        'templates' => [
            'session_reminder' => 'session_reminder',
            'session_started' => 'session_started',
            'session_cancelled' => 'session_cancelled',
            'session_ended' => 'session_ended',
            'halaqa_message' => 'halaqa_message',
            'progress_recorded' => 'progress_recorded',
            'added_to_halaqa' => 'added_to_halaqa',
            'account_created' => 'account_created',
        ],
    ],

    /*
     * Speech to text with the diacritics, to check the vowels (fatha, damma, kasra) of a recitation in
     * the mushaf and kids memorization. Run the service in transcriber/ (npm install && npm start) and
     * set its address here; without it the recitation check uses the browser and ignores the vowels.
     */
    'transcriber' => [
        'url' => env('TRANSCRIBER_URL'),
        'token' => env('TRANSCRIBER_TOKEN'),
        'timeout' => env('TRANSCRIBER_TIMEOUT', 60),
    ],

];
