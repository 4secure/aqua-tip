<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;

class DarkWebSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'query' => 'required|string|max:320',
            'type' => 'required|in:email,domain',
        ];
    }

    /**
     * Add conditional format validation based on type.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $type = $this->input('type');
            $query = $this->input('query');

            if ($validator->errors()->any()) {
                return;
            }

            if ($type === 'email' && ! filter_var($query, FILTER_VALIDATE_EMAIL)) {
                $validator->errors()->add('query', 'The query must be a valid email address.');
            }

            if ($type === 'domain' && ! preg_match('/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/', $query)) {
                $validator->errors()->add('query', 'The query must be a valid domain name.');
            }
        });
    }
}
