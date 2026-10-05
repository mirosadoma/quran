<?php

namespace Database\Seeders;

use App\Enums\Gender;
use App\Enums\JoinRequestStatus;
use App\Enums\UserRole;
use App\Models\Academy;
use App\Models\AcademyJoinRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo data: students who opened their own account without academy. One of them asked to join
 * the main academy (its manager sees the request), the other can browse the academies. Local
 * environment only; they sign in with the password "password".
 */
class AcademyJoinRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $academy = Academy::query()->firstWhere('slug', 'rattil');

        if ($academy === null) {
            return;
        }

        $waiting = $this->student('إبراهيم سعيد', 'independent@rattil.test', Gender::Male);
        $this->student('ليلى حسن', 'independent2@rattil.test', Gender::Female);

        AcademyJoinRequest::query()->firstOrCreate(
            ['academy_id' => $academy->id, 'user_id' => $waiting->id, 'status' => JoinRequestStatus::Pending],
            ['message' => 'السلام عليكم، أحفظ جزء عمّ وأرغب في الانضمام لحلقة مسائية لحفظ جزء تبارك.'],
        );
    }

    protected function student(string $name, string $email, Gender $gender): User
    {
        return User::query()->updateOrCreate(['email' => $email], [
            'name' => $name,
            'password' => 'password',
            'role' => UserRole::Student,
            'academy_id' => null,
            'gender' => $gender,
            'timezone' => config('app.user_timezone'),
            'locale' => 'ar',
            'country' => 'مصر',
            'is_active' => true,
        ]);
    }
}
