<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EnterpriseContactMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array $contactData
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Enterprise Inquiry: {$this->contactData['plan_name']}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.enterprise-contact',
            with: ['contactData' => $this->contactData],
        );
    }
}
