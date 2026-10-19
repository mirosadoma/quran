<?php

namespace App\Events;

use App\Models\ExamDay;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Lets the open pages of an exam day (the room, the exam page, the dashboards) refresh when the
 * day opens or closes, or a student is alerted, called, examined or graded.
 */
class ExamDayUpdated implements ShouldBroadcastNow, ShouldRescue
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public ExamDay $day) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('exam-day.'.$this->day->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'exam-day.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->day->id,
            'status' => $this->day->status->value,
            'phase' => $this->day->phase->value,
        ];
    }
}
