<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('progress_records', function (Blueprint $table) {
            $table->uuid('group_uuid')->nullable()->after('teacher_id')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('progress_records', function (Blueprint $table) {
            $table->dropIndex(['group_uuid']);
            $table->dropColumn('group_uuid');
        });
    }
};
