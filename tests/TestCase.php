<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * A cached configuration ignores phpunit.xml: the tests would run against the real database
     * and RefreshDatabase would wipe it. Stop before the application boots.
     */
    protected function setUp(): void
    {
        if (is_file(dirname(__DIR__).'/bootstrap/cache/config.php')) {
            $this->fail('The configuration is cached (php artisan optimize): run php artisan config:clear first, or the tests would wipe the real database.');
        }

        parent::setUp();
    }
}
