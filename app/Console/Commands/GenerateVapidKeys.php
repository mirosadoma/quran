<?php

namespace App\Console\Commands;

use App\Services\WebPush\WebPush;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('webpush:keys {--show : Print the keys instead of writing them to .env} {--force : Replace keys that already exist}')]
#[Description('Create the VAPID keys that sign the push notifications sent to phones and computers')]
class GenerateVapidKeys extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $keys = WebPush::generateKeys();

        if ($this->option('show')) {
            $this->line('VAPID_PUBLIC_KEY='.$keys['public_key']);
            $this->line('VAPID_PRIVATE_KEY='.$keys['private_key']);

            return self::SUCCESS;
        }

        $path = $this->laravel->environmentFilePath();

        if (! is_file($path)) {
            $this->components->error('The .env file was not found. Use --show and add the keys yourself.');

            return self::FAILURE;
        }

        $content = (string) file_get_contents($path);

        if (preg_match('/^VAPID_PRIVATE_KEY=\S+/m', $content) && ! $this->option('force')) {
            $this->components->warn('VAPID keys already exist. Replacing them stops the notifications of every subscribed device; use --force to do it anyway.');

            return self::FAILURE;
        }

        foreach (['VAPID_PUBLIC_KEY' => $keys['public_key'], 'VAPID_PRIVATE_KEY' => $keys['private_key']] as $name => $value) {
            $content = preg_match("/^{$name}=.*$/m", $content)
                ? (string) preg_replace("/^{$name}=.*$/m", "{$name}={$value}", $content)
                : rtrim($content, "\n")."\n{$name}={$value}\n";
        }

        file_put_contents($path, $content);

        $this->components->info('VAPID keys written to .env. Run php artisan config:clear if the configuration is cached.');

        return self::SUCCESS;
    }
}
