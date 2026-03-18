<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ThreatSearchRequest extends FormRequest
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
            'query' => ['required', 'string', 'min:1', 'max:500'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->query)) {
            $this->merge(['query' => trim($this->query)]);
        }
    }
}
