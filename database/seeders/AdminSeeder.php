<?php

namespace Database\Seeders;

use App\Enums\Gender;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * The administration account. On the developer's machine: the demo account admin@rattil.test (password
 * "password"). On a server: the account of ADMIN_EMAIL / ADMIN_PASSWORD (config app.admin), created only
 * while the platform has no administration account, so running the seeders again never resets a password.
 */
class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (app()->environment('local')) {
            $this->createDemoAdmin();

            return;
        }

        if (User::query()->admins()->exists()) {
            $this->command?->info('The administration account exists already: it is left as it is.');

            return;
        }

        $email = config('app.admin.email');

        if (blank($email)) {
            throw new RuntimeException('Set ADMIN_EMAIL (and ADMIN_PASSWORD) in the .env file to create the administration account, then run the seeders again.');
        }

        $password = config('app.admin.password') ?: Str::password(16, symbols: false);

        User::query()->create([
            ...$this->attributes(),
            'name' => config('app.admin.name'),
            'email' => $email,
            'phone' => config('app.admin.phone'),
            'password' => $password,
        ]);

        if (blank(config('app.admin.password'))) {
            $this->command?->warn("The administration account: {$email} with the password {$password} (shown once: change it after signing in).");
        } else {
            $this->command?->info("The administration account {$email} is created: remove ADMIN_PASSWORD from the .env file.");
        }
    }

    protected function createDemoAdmin(): void
    {
        User::query()->updateOrCreate(['email' => 'admin@rattil.test'], [
            ...$this->attributes(),
            'name' => 'إدارة المنصة',
            'phone' => '+201000000000',
            'password' => 'password',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function attributes(): array
    {
        return [
            'role' => UserRole::Admin,
            'gender' => Gender::Male,
            'timezone' => config('app.user_timezone'),
            'locale' => 'ar',
            'is_active' => true,
        ];
    }
}
