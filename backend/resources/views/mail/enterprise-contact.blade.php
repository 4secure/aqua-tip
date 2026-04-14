@component('mail::message')
# Enterprise Plan Inquiry

**Plan:** {{ $contactData['plan_name'] }}

***

## Contact Details

| Field | Value |
|-------|-------|
| **Name** | {{ $contactData['name'] }} |
| **Email** | {{ $contactData['email'] }} |

@if(!empty($contactData['message']))
## Message

{{ $contactData['message'] }}
@endif

@if(!empty($contactData['user_email']))

***

## Authenticated User Context

| Field | Value |
|-------|-------|
| **Account Email** | {{ $contactData['user_email'] }} |
| **Current Plan** | {{ $contactData['user_plan'] ?? 'None' }} |
| **Trial Active** | {{ $contactData['trial_active'] ? 'Yes' : 'No' }} |
@endif

Thanks,<br>
{{ config('app.name') }}
@endcomponent
