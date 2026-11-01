<?php

namespace App\Observers;

use App\Services\ContentCache;
use Illuminate\Database\Eloquent\Model;

/**
 * Empties the cached section of a model when the administration (or anyone) adds, changes, turns off
 * or deletes one (see ContentCache).
 */
class ContentCacheObserver
{
    public function __construct(protected ContentCache $cache) {}

    /**
     * Handle the "saved" event.
     */
    public function saved(Model $model): void
    {
        $this->cache->flushModel($model);
    }

    /**
     * Handle the "deleted" event.
     */
    public function deleted(Model $model): void
    {
        $this->cache->flushModel($model);
    }
}
