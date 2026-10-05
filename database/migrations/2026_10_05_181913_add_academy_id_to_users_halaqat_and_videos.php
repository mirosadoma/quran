<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Null for the platform administration and for students who joined no academy.
            $table->foreignId('academy_id')->nullable()->after('role')->constrained()->nullOnDelete();
        });

        Schema::table('halaqat', function (Blueprint $table) {
            $table->foreignId('academy_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        Schema::table('videos', function (Blueprint $table) {
            // Null: the platform's library, shown to everyone and on the public site.
            $table->foreignId('academy_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        $this->moveExistingDataToAnAcademy();
    }

    /**
     * Before academies, the platform was one academy: its halaqat, teachers and students move into
     * an academy with its name, so everything keeps working.
     */
    protected function moveExistingDataToAnAcademy(): void
    {
        if (! DB::table('halaqat')->exists() && ! DB::table('users')->whereIn('role', ['teacher', 'student'])->exists()) {
            return;
        }

        $setting = fn (string $key): mixed => json_decode((string) DB::table('settings')->where('key', $key)->value('value'), true);
        $name = $setting('academy_name') ?: 'رتّل';
        $name = str_contains($name, 'أكاديمية') ? $name : 'أكاديمية '.$name;

        $academyId = DB::table('academies')->insertGetId([
            'name' => $name,
            'slug' => Str::slug(Str::ascii($name)) ?: 'academy',
            'tagline' => $setting('academy_tagline'),
            'email' => $setting('contact_email'),
            'phone' => $setting('contact_phone'),
            'timezone' => $setting('default_timezone'),
            'is_active' => true,
            'accepts_requests' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('halaqat')->update(['academy_id' => $academyId]);
        DB::table('users')->whereIn('role', ['teacher', 'student'])->update(['academy_id' => $academyId]);
        DB::table('videos')->whereNotNull('halaqa_id')->update(['academy_id' => $academyId]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['videos', 'halaqat', 'users'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('academy_id');
            });
        }
    }
};
