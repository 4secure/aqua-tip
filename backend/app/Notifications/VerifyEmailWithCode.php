<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Carbon;

class VerifyEmailWithCode extends Notification
{
    use Queueable;

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $code = $this->generateCode($notifiable);
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Verify Your Email Address')
            ->greeting('Welcome to AquaTip!')
            ->line('Your verification code is:')
            ->line("**{$code}**")
            ->line('This code expires in 15 minutes.')
            ->action('Or Click to Verify', $verificationUrl)
            ->line('If you did not create an account, no further action is required.');
    }

    /**
     * Generate and cache a 6-digit verification code.
     */
    protected function generateCode(object $notifiable): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put(
            "email_verify_code:{$notifiable->getKey()}",
            $code,
            now()->addMinutes(15)
        );

        return $code;
    }

    /**
     * Get the signed verification URL for the notifiable.
     */
    protected function verificationUrl(object $notifiable): string
    {
        $apiUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        return config('services.frontend_url') . '/verify-email?verify_url=' . urlencode($apiUrl);
    }
}
