<?php

namespace App\Mail;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LeaveRequested extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public LeaveRequest $leave) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'New leave request from ' . $this->leave->user->name);
    }

    public function content(): Content
    {
        // Button opens the leave page on the website
        $url = rtrim(config('worksphere.frontend_url'), '/') . '/leave-management?request=' . $this->leave->id;

        return new Content(markdown: 'emails.leave-requested', with: ['url' => $url]);
    }
}
