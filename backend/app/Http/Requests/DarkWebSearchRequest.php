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
            'query' => 'required|string|min:2|max:320',
            'type' => 'nullable|string|max:32',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $query = trim((string) $this->input('query', ''));

            if ($query === '') {
                $validator->errors()->add('query', 'The query cannot be empty.');
            }
        });
    }
}
