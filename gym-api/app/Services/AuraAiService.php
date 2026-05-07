<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AuraAiService
{
    protected $token;
    protected $model = "gpt2"; // Baseline model for connectivity verification

    public function __construct()
    {
        $this->token = config('services.huggingface.token');
    }

    public function getToken()
    {
        return $this->token;
    }

    public function ask(string $question, array $context): string
    {
        $token = trim($this->token);
        
        $systemPrompt = "You are Aura AI, a professional biometric fitness assistant. 
        Context: Weight {$context['weight']}kg, Protein {$context['protein']}g, Water {$context['water']}L, Goal: {$context['goal']}.
        Instructions: Give extremely concise, professional fitness advice. Keep your response STRICTLY under 2 sentences and maximum 40 words. Be direct and punchy.
        User: {$question}";

        $lastError = null;

        try {
            // Using Pollinations AI - A 100% free, no-token required API for immediate functionality
            $response = Http::withoutVerifying() 
            ->timeout(30)
            ->post("https://text.pollinations.ai/", [
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $question]
                ],
                'jsonMode' => false
            ]);

            if ($response->successful()) {
                // Pollinations returns the raw text string directly
                $text = $response->body();
                if (!empty($text)) {
                    return trim($text);
                }
            } else {
                $lastError = "API {$response->status()} @ Pollinations";
                Log::warning("Aura AI Sync Failed: " . $response->status() . " - " . $response->body());
            }
        } catch (\Exception $e) {
            $lastError = "Connection Error";
            Log::error("Aura AI Connection Exception: " . $e->getMessage());
        }

        // --- ENHANCED NEURAL HUB FALLBACK ---
        $q = strtolower($question);
        $errorTag = $lastError ? " [Sync: {$lastError}]" : "";
        $prefix = "Neural Hub Local Node [v2.5.0] Active{$errorTag}. ";
        
        if (str_contains($q, 'hi') || str_contains($q, 'hello') || str_contains($q, 'hey')) {
            return $prefix . "Greetings, Member. Your biometric pulse is stable at " . ($context['weight']) . "kg. How can I optimize your protocol today?";
        }

        if (str_contains($q, 'protein') || str_contains($q, 'eat') || str_contains($q, 'food')) {
            $target = round($context['weight'] * 2.2);
            $diff = $target - $context['protein'];
            return $prefix . "Based on your {$context['goal']} goal, your protein synthesis target is {$target}g/day. You are currently at {$context['protein']}g. " . ($diff > 0 ? "I recommend a {$diff}g increase via lean sources." : "Your protein intake is optimal.");
        }

        if (str_contains($q, 'water') || str_contains($q, 'drink') || str_contains($q, 'hydrat')) {
            $status = $context['water'] < 3 ? "low" : "stable";
            return $prefix . "Hydration sync is {$status} at {$context['water']}L. For your mass node ({$context['weight']}kg), aim for 3.5L to ensure metabolic conductivity.";
        }

        if (str_contains($q, 'progress') || str_contains($q, 'how am i') || str_contains($q, 'rank')) {
            return $prefix . "Protocol Rank: {$context['rank']}. Evolution Points are synchronized. Your {$context['goal']} trend is consistent with biometric targets. Keep up the intensity.";
        }

        if (str_contains($q, 'weight')) {
            return $prefix . "Current weight node: {$context['weight']}kg. Goal: {$context['goal']}. Focus on consistency and caloric tracking to reach your target vector.";
        }

        return $prefix . "The cloud link is currently congested. Local analysis suggest you focus on " . ($context['water'] < 2.5 ? "hydration sync" : "training intensity") . " until full connectivity is restored.";
    }

    public function analyzeImage(string $base64Image): array
    {
        // Require the free Gemini API Key
        $apiKey = env('GEMINI_API_KEY');
        if (!$apiKey) {
            return [
                'score' => 0,
                'measurements' => ['chest' => 0, 'waist' => 0, 'biceps' => 0, 'thighs' => 0],
                'insights' => ['ERROR: GEMINI_API_KEY is missing in your .env file.', 'Please create a free key at Google AI Studio and add it.']
            ];
        }

        // Clean base64 string
        $base64Data = preg_replace('#^data:image/\w+;base64,#i', '', $base64Image);

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => 'Analyze this physique photo. You are a fitness AI. You must return EXACTLY and ONLY a valid JSON object matching this schema: {"score": 85, "measurements": {"chest": 90, "waist": 75, "biceps": 60, "thighs": 70}, "insights": ["Great symmetry.", "Lighting is good.", "Focus on core."]} Give realistic numbers based on the visual estimate of the person. Do not include any markdown tags like ```json.'],
                        [
                            'inlineData' => [
                                'mimeType' => 'image/jpeg',
                                'data' => $base64Data
                            ]
                        ]
                    ]
                ]
            ]
        ];

        try {
            $response = Http::withoutVerifying()
                ->timeout(45)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}", $payload);

            if ($response->successful()) {
                $data = $response->json();
                $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
                $text = trim(str_replace(['```json', '```'], '', $text));
                
                $result = json_decode($text, true);
                if (is_array($result) && isset($result['score'])) {
                    return $result;
                }
            }
            Log::warning("Gemini Vision Failed: " . $response->body());
        } catch (\Exception $e) {
            Log::error("Gemini Connection Error: " . $e->getMessage());
        }

        return [
            'score' => 0,
            'measurements' => ['chest' => 0, 'waist' => 0, 'biceps' => 0, 'thighs' => 0],
            'insights' => ['Error: Could not connect to Gemini Vision API.']
        ];
    }
}
