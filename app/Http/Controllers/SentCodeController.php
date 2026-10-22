<?php

namespace App\Http\Controllers;

use App\Models\SentCode;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The codes (OTP) the platform sent in the last hours with the account each went to, so the
 * administration can give a code to a user whose email or message did not arrive.
 */
class SentCodeController extends Controller
{
    public function index(): Response
    {
        $codes = SentCode::query()
            ->recent()
            ->with('user:id,name,email,phone,role')
            ->latest('id')
            ->get();

        // Only the newest code of an account works (for the same purpose): a new code replaces the previous one.
        $newest = $codes->unique(fn (SentCode $code): string => $code->user_id.'|'.$code->purpose->value)->pluck('id')->flip();

        return Inertia::render('sent-codes/index', [
            'codes' => $codes->map(fn (SentCode $code): array => [
                'id' => $code->id,
                'code' => $code->code,
                'purpose' => $code->purpose->value,
                'channel' => $code->channel,
                'destination' => $code->destination,
                'status' => $this->status($code, $newest->has($code->id)),
                'sent_at' => $code->created_at?->toIso8601String(),
                'expires_at' => $code->expires_at->toIso8601String(),
                'user' => [
                    'id' => $code->user->id,
                    'name' => $code->user->name,
                    'email' => $code->user->email,
                    'phone' => $code->user->phone,
                    'role' => $code->user->role->value,
                ],
            ])->values(),
            'keepHours' => SentCode::KEEP_HOURS,
        ]);
    }

    /**
     * Whether the code can still be given to the user.
     */
    protected function status(SentCode $code, bool $newest): string
    {
        return match (true) {
            $code->used_at !== null => 'used',
            $code->blocked_at !== null => 'blocked',
            ! $newest => 'replaced',
            $code->expires_at->isPast() => 'expired',
            default => 'valid',
        };
    }
}
