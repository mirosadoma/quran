<?php

namespace App\Services\Meetings;

/**
 * Meeting information returned by a provider after creating a meeting.
 */
final class MeetingDetails
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        public ?string $id = null,
        public ?string $url = null,
        public ?string $password = null,
        public array $data = [],
    ) {}

    /**
     * Attributes to store on the session.
     *
     * @return array{meeting_id: string|null, meeting_url: string|null, meeting_password: string|null, meeting_data: array<string, mixed>|null}
     */
    public function toAttributes(): array
    {
        return [
            'meeting_id' => $this->id,
            'meeting_url' => $this->url,
            'meeting_password' => $this->password,
            'meeting_data' => $this->data === [] ? null : $this->data,
        ];
    }
}
