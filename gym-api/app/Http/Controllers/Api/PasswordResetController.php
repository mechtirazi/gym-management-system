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
            \Illuminate\Support\Facades\Mail::to($input)->send(new \App\Mail\PasswordResetMail($code));
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
