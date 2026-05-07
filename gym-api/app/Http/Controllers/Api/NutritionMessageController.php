<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NutritionMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NutritionMessageController extends Controller
{
    /**
     * Get all unique conversations for the current user.
     */
    public function conversations()
    {
        $userId = Auth::id();

        // Use a more robust query to find the latest message for each conversation
        // We'll get the maximum created_at for each pair of (sender, receiver)
        // normalized so that (A, B) and (B, A) are treated as the same thread.
        
        $conversations = NutritionMessage::select('nutrition_messages.*')
            ->where(function ($query) use ($userId) {
                $query->where('id_sender', $userId)
                      ->orWhere('id_receiver', $userId);
            })
            ->whereIn('created_at', function ($query) use ($userId) {
                $query->selectRaw('MAX(created_at)')
                    ->from('nutrition_messages')
                    ->where('id_sender', $userId)
                    ->orWhere('id_receiver', $userId)
                    ->groupByRaw('CASE WHEN id_sender = ? THEN id_receiver ELSE id_sender END', [$userId]);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        $data = [];
        foreach ($conversations as $msg) {
            $otherUserId = $msg->id_sender == $userId ? $msg->id_receiver : $msg->id_sender;
            $otherUser = \App\Models\User::find($otherUserId);
            
            if ($otherUser) {
                $data[] = [
                    'id_user' => $otherUser->id_user,
                    'name' => $otherUser->name . ' ' . $otherUser->last_name,
                    'profile_picture' => $otherUser->profile_picture,
                    'last_message' => $msg->text,
                    'created_at' => $msg->created_at,
                    'is_outgoing' => $msg->id_sender == $userId
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => count($data) . ' conversations synchronized.',
        ], 200);
    }

    /**
     * Display a listing of messages for a specific conversation.
     */
    public function index($recipientId)
    {
        $userId = Auth::id();

        $messages = NutritionMessage::where(function ($query) use ($userId, $recipientId) {
            $query->where('id_sender', $userId)
                  ->where('id_receiver', $recipientId);
        })->orWhere(function ($query) use ($userId, $recipientId) {
            $query->where('id_sender', $recipientId)
                  ->where('id_receiver', $userId);
        })
        ->orderBy('created_at', 'asc')
        ->get();

        return response()->json([
            'success' => true,
            'data' => $messages,
            'message' => 'Messages retrieved successfully.',
        ], 200);
    }

    /**
     * Store a newly created message in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'id_receiver' => 'required|uuid|exists:users,id_user',
            'text' => 'required|string',
        ]);

        $message = NutritionMessage::create([
            'id_sender' => Auth::id(),
            'id_receiver' => $request->id_receiver,
            'text' => $request->text,
        ]);

        return response()->json([
            'success' => true,
            'data' => $message,
            'message' => 'Message sent successfully.',
        ], 201);
    }
}
