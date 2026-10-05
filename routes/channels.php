<?php

use App\Models\Halaqa;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id): bool {
    return $user->id === $id;
});

/*
 * Private channel (chat & session events) and presence channel (who is online,
 * typing indicator) of a halaqa. Members get their public profile.
 */
Broadcast::channel('halaqa.{halaqa}', function (User $user, Halaqa $halaqa): array|false {
    if (! $halaqa->hasMember($user)) {
        return false;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'role' => $user->role->value,
        'avatar_url' => $user->avatar_url,
    ];
});
