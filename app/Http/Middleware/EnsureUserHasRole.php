<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Allow the request only for the given roles, e.g. "role:admin,teacher".
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $allowed = array_map(fn (string $role): UserRole => UserRole::from($role), $roles);

        abort_unless($request->user()?->hasRole(...$allowed), 403);

        return $next($request);
    }
}
