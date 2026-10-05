<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Resources\Json\JsonResource;
use Inertia\Inertia;

abstract class Controller
{
    use AuthorizesRequests;

    /**
     * Transform every item of a paginator through an API resource.
     *
     * @param  class-string<JsonResource>  $resource
     */
    protected function paginated(LengthAwarePaginator $paginator, string $resource): LengthAwarePaginator
    {
        return $paginator->through(fn ($model): array => (new $resource($model))->resolve());
    }

    /**
     * Flash a toast message shown by the frontend after the next render.
     */
    protected function toast(string $message, string $type = 'success'): void
    {
        Inertia::flash('toast', ['type' => $type, 'message' => $message]);
    }
}
