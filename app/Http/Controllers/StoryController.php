<?php

namespace App\Http\Controllers;

use App\Enums\StoryKind;
use App\Models\Reciter;
use App\Services\StoryLibrary;
use Inertia\Inertia;
use Inertia\Response;

class StoryController extends Controller
{
    public function __construct(protected StoryLibrary $library) {}

    /**
     * Stories for children, to read or to listen to.
     */
    public function kidsIndex(): Response
    {
        return $this->index(StoryKind::Kids);
    }

    /**
     * One story for children.
     */
    public function kidsShow(string $slug): Response
    {
        return $this->show(StoryKind::Kids, $slug);
    }

    /**
     * The stories of the prophets, in their order.
     */
    public function prophetsIndex(): Response
    {
        return $this->index(StoryKind::Prophets);
    }

    /**
     * The whole story of one prophet.
     */
    public function prophetsShow(string $slug): Response
    {
        return $this->show(StoryKind::Prophets, $slug);
    }

    protected function index(StoryKind $kind): Response
    {
        return Inertia::render('stories/index', [
            'kind' => $kind->value,
            'stories' => $this->library->all($kind),
        ]);
    }

    /**
     * A story with the text of its ayahs (played with a reciter), and the stories around it.
     */
    protected function show(StoryKind $kind, string $slug): Response
    {
        $story = $this->library->find($kind, $slug);

        abort_if($story === null, 404);

        return Inertia::render('stories/show', [
            'kind' => $kind->value,
            'story' => $story,
            ...$this->library->neighbours($kind, $slug),
            'reciters' => Reciter::query()->available()->get()->map(fn (Reciter $reciter): array => $reciter->toPlayerArray())->values(),
        ]);
    }
}
