<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Credit extends Model
{
    protected $fillable = [
        'user_id',
        'ip_address',
        'remaining',
        'limit',
        'last_reset_at',
    ];

    protected function casts(): array
    {
        return [
            'last_reset_at' => 'datetime',
            'remaining' => 'integer',
            'limit' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
