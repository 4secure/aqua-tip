<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SearchLog extends Model
{
    public const VALID_MODULES = ['threat_search', 'ip_search', 'dark_web'];

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'ip_address',
        'module',
        'query',
        'type',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
