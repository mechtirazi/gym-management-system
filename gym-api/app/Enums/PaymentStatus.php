<?php

namespace App\Enums;

enum PaymentStatus: string {
    case Pending = 'pending';
    case Finalized = 'finalized';
    case Failed = 'failed';
    case Refunded = 'refunded';
}
