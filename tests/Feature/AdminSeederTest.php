<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\AdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class AdminSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_server_gets_the_administration_account_of_its_env_file_once(): void
    {
        $this->onServer(['email' => 'owner@wird.app', 'password' => 'first-secret', 'name' => 'صاحب المنصة']);

        (new AdminSeeder)->run();

        $admin = User::query()->sole();
        $this->assertSame('owner@wird.app', $admin->email);
        $this->assertSame('صاحب المنصة', $admin->name);
        $this->assertSame(UserRole::Admin, $admin->role);
        $this->assertTrue(Hash::check('first-secret', $admin->password));

        // Seeding again (new content later) keeps the password the administration chose meanwhile.
        $admin->update(['password' => 'changed-later']);
        config(['app.admin.password' => 'first-secret']);

        (new AdminSeeder)->run();

        $this->assertSame(1, User::query()->count());
        $this->assertTrue(Hash::check('changed-later', $admin->fresh()->password));
    }

    public function test_a_server_without_password_gets_a_random_one_and_never_the_demo_password(): void
    {
        $this->onServer(['email' => 'owner@wird.app']);

        (new AdminSeeder)->run();

        $admin = User::query()->sole();
        $this->assertFalse(Hash::check('password', $admin->password));
        $this->assertFalse(User::query()->where('email', 'admin@rattil.test')->exists());
    }

    public function test_a_server_without_admin_email_stops_with_a_clear_message(): void
    {
        $this->onServer([]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ADMIN_EMAIL');

        (new AdminSeeder)->run();
    }

    public function test_the_developer_machine_keeps_the_demo_administration_account(): void
    {
        $this->app->detectEnvironment(fn (): string => 'local');

        (new AdminSeeder)->run();
        (new AdminSeeder)->run();

        $admin = User::query()->sole();
        $this->assertSame('admin@rattil.test', $admin->email);
        $this->assertTrue(Hash::check('password', $admin->password));
    }

    /**
     * @param  array{email?: string, password?: string, name?: string}  $admin
     */
    protected function onServer(array $admin): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        config(['app.admin' => [
            'name' => $admin['name'] ?? 'إدارة المنصة',
            'email' => $admin['email'] ?? null,
            'phone' => null,
            'password' => $admin['password'] ?? null,
        ]]);
    }
}
