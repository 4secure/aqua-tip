<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when OpenCTI is unreachable due to network, timeout, or configuration errors.
 */
class OpenCtiConnectionException extends RuntimeException
{
}
