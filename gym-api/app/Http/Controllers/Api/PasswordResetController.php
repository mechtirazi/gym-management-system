<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PasswordResetController extends Controller
{
    public function forgotPassword(Request $request)
    {
        \Illuminate\Support\Facades\Log::info("forgotPassword request received for: " . $request->email_or_phone);
        $request->validate([
            'email_or_phone' => 'required|string',
        ]);

        $input = $request->email_or_phone;
        $isEmail = filter_var($input, FILTER_VALIDATE_EMAIL);
        
        $userQuery = \App\Models\User::query();
        if ($isEmail) {
            $userQuery->where('email', $input);
        } else {
            $userQuery->where('phone', $input);
        }
        
        $user = $userQuery->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found with this contact information.',
            ], 404);
        }

        $code = rand(100000, 999999);

        // Delete previous OTPs
        if ($isEmail) {
            \Illuminate\Support\Facades\DB::table('password_reset_otps')->where('email', $input)->delete();
            \Illuminate\Support\Facades\DB::table('password_reset_otps')->insert([
                'email' => $input,
                'code' => $code,
                'created_at' => now(),
            ]);

            try {
                // Use SendGrid HTTP API directly — works on Railway (no SMTP blocking)
                $sendgridKey = env('SENDGRID_API_KEY');
                if (!$sendgridKey) {
                    throw new \Exception('SENDGRID_API_KEY not configured');
                }

                $response = \Illuminate\Support\Facades\Http::withHeaders([
                    'Authorization' => 'Bearer ' . $sendgridKey,
                    'Content-Type'  => 'application/json',
                ])->post('https://api.sendgrid.com/v3/mail/send', [
                    'personalizations' => [['to' => [['email' => $input]]]],
                    'from'    => [
                        'email' => env('MAIL_FROM_ADDRESS', 'razzymechti@gmail.com'),
                        'name'  => env('MAIL_FROM_NAME', 'GymManagement'),
                    ],
                    'subject' => 'Your Password Reset Code',
                    'content' => [[
                        'type'  => 'text/html',
                        'value' => '
                            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
                                <h2 style="color:#1e293b;">Password Reset Request</h2>
                                <p>You requested to reset your password. Use the following code:</p>
                                <div style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#e2e8f0;padding:16px;border-radius:6px;text-align:center;color:#0f172a;">' . $code . '</div>
                                <p style="margin-top:16px;color:#64748b;font-size:13px;">This code expires in 15 minutes. If you did not request this, ignore this email.</p>
                            </div>',
                    ]],
                ]);

                if (!$response->successful()) {
                    throw new \Exception('SendGrid API error: ' . $response->body());
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Password reset mail failed: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to send reset email. Please check mail configuration. Erreur : ' . $e->getMessage(),
                ], 500);
            }
        } else {
            \Illuminate\Support\Facades\DB::table('password_reset_otps')->where('phone', $input)->delete();
            \Illuminate\Support\Facades\DB::table('password_reset_otps')->insert([
                'phone' => $input,
                'code' => $code,
                'created_at' => now(),
            ]);

            // Send WhatsApp message using Twilio API (Free Sandbox)
            $twilioSid = config('services.twilio.sid');
            $twilioToken = config('services.twilio.token');
            $twilioWhatsAppFrom = config('services.twilio.whatsapp_from');

            if ($twilioSid && $twilioToken) {
                // Formatting for Tunisia if no country code (8 digits)
                $formattedPhone = $input;
                if (!str_starts_with($formattedPhone, '+')) {
                    if (strlen($formattedPhone) === 8) {
                        $formattedPhone = '+216' . $formattedPhone;
                    } else {
                        $formattedPhone = '+' . $formattedPhone;
                    }
                }

                $response = \Illuminate\Support\Facades\Http::withBasicAuth($twilioSid, $twilioToken)
                    ->asForm()
                    ->post("https://api.twilio.com/2010-04-01/Accounts/$twilioSid/Messages.json", [
                        'From' => "whatsapp:$twilioWhatsAppFrom",
                        'To' => "whatsapp:$formattedPhone",
                        'Body' => "🏋️‍♂️ *Gym Management System* \n\nYour password reset code is: *$code*. \n\nThis code will expire in 15 minutes."
                    ]);

                if (!$response->successful()) {
                    \Illuminate\Support\Facades\Log::error("Twilio WhatsApp Error: " . $response->body());
                }
            } else {
                \Illuminate\Support\Facades\Log::info("WhatsApp (Not Configured) to $input: Your password reset code is $code");
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Password reset code sent successfully.',
        ], 200);
    }

    public function verifyCode(Request $request)
    {
        $request->validate([
            'email_or_phone' => 'required|string',
            'code' => 'required|string',
        ]);

        $input = $request->email_or_phone;
        $isEmail = filter_var($input, FILTER_VALIDATE_EMAIL);
        $code = $request->code;

        $query = \Illuminate\Support\Facades\DB::table('password_reset_otps')
            ->where('code', $code);
            
        if ($isEmail) {
            $query->where('email', $input);
        } else {
            $query->where('phone', $input);
        }

        $otp = $query->first();

        if (!$otp) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired code.',
            ], 400);
        }

        // Optional: check expiration (e.g. 15 minutes)
        if (\Carbon\Carbon::parse($otp->created_at)->addMinutes(15)->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Code has expired.',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Code verified successfully.',
        ], 200);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email_or_phone' => 'required|string',
            'code' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $input = $request->email_or_phone;
        $isEmail = filter_var($input, FILTER_VALIDATE_EMAIL);
        $code = $request->code;

        $query = \Illuminate\Support\Facades\DB::table('password_reset_otps')
            ->where('code', $code);
            
        if ($isEmail) {
            $query->where('email', $input);
        } else {
            $query->where('phone', $input);
        }

        $otp = $query->first();

        if (!$otp || \Carbon\Carbon::parse($otp->created_at)->addMinutes(15)->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired code.',
            ], 400);
        }

        $userQuery = \App\Models\User::query();
        if ($isEmail) {
            $userQuery->where('email', $input);
        } else {
            $userQuery->where('phone', $input);
        }
        
        $user = $userQuery->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        $user->password = \Illuminate\Support\Facades\Hash::make($request->password);
        $user->save();

        // Delete used OTP
        if ($isEmail) {
            \Illuminate\Support\Facades\DB::table('password_reset_otps')->where('email', $input)->delete();
        } else {
            \Illuminate\Support\Facades\DB::table('password_reset_otps')->where('phone', $input)->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully.',
        ], 200);
    }
}
