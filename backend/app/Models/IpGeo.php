<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IpGeo extends Model
{
    protected $table = 'ip_geo';

    protected $primaryKey = 'ip';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'ip',
        'country_code',
        'country_name',
        'city',
        'lat',
        'lng',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'created_at' => 'datetime',
        ];
    }
}
