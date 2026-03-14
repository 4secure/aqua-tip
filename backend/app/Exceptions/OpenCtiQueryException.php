<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when OpenCTI returns GraphQL-level errors in a 200 response.
 */
class OpenCtiQueryException extends RuntimeException
{
}
