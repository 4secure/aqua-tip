<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class IocSearchRequest extends FormRequest
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
            'query' => 'required|string|max:500',
        ];
    }
}
