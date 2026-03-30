<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    protected $token;
    protected $sentimentModel = 'distilbert-base-uncased-finetuned-sst-2-english';
    protected $categoryModel = 'facebook/bart-large-mnli';
    protected $embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';

    public function __construct()
    {
        $this->token = config('services.huggingface.token');
    }

    /**
     * Analyze sentiment and category of a review comment using Hugging Face
     */
    public function analyzeReview(string $comment): array
    {
        if (!$this->token) {
            return [
                'score' => 0.5,
                'category' => 'General'
            ];
        }

        return [
            'score' => $this->getSentimentScore($comment),
            'category' => $this->getCategory($comment),
        ];
    }

    /**
     * Get sentiment score (0 to 1)
     */
    protected function getSentimentScore(string $text): float
    {
        $maxRetries = 3;
        $retryDelay = 5; // seconds

        for ($i = 0; $i < $maxRetries; $i++) {
            try {
                // Using the full namespace for better reliability on the router
                $response = Http::withToken($this->token)
                    ->post("https://router.huggingface.co/hf-inference/models/distilbert/distilbert-base-uncased-finetuned-sst-2-english", [
                        'inputs' => $text,
                    ]);

                $result = $response->json();

                if ($response->successful()) {
                    Log::info("Hugging Face Sentiment Result: " . json_encode($result));
                    // Sometimes it returns [[{"label": "...", "score": ...}]]
                    // Sometimes it returns [{"label": "...", "score": ...}]
                    $scores = isset($result[0]) && is_array($result[0]) ? $result[0] : $result;
                    
                    if (is_array($scores)) {
                        foreach ($scores as $s) {
                            if (isset($s['label'])) {
                                if ($s['label'] === 'POSITIVE') {
                                    return (float) $s['score'];
                                }
                                if ($s['label'] === 'NEGATIVE') {
                                    return (float) (1 - $s['score']);
                                }
                            }
                        }
                    }
                } elseif ($response->status() === 503 && isset($result['estimated_time'])) {
                    $wait = (int) $result['estimated_time'];
                    Log::warning("HF Model loading. Waiting {$wait} seconds...");
                    sleep(min($wait, 10));
                    continue;
                } else {
                    Log::error("Hugging Face Sentiment API failed: " . $response->body());
                    break;
                }
            } catch (\Exception $e) {
                Log::error("Hugging Face Sentiment Error: " . $e->getMessage());
                break;
            }
        }

        return 0.5;
    }

    /**
     * Get category using Zero-Shot Classification
     */
    protected function getCategory(string $text): string
    {
        $candidateLabels = ['Equipment', 'Cleanliness', 'Staff', 'Classes', 'Atmosphere', 'Price'];
        $maxRetries = 3;

        for ($i = 0; $i < $maxRetries; $i++) {
            try {
                $response = Http::withToken($this->token)
                    ->post("https://router.huggingface.co/hf-inference/models/{$this->categoryModel}", [
                        'inputs' => $text,
                        'parameters' => ['candidate_labels' => $candidateLabels],
                    ]);

                $result = $response->json();

                if ($response->successful()) {
                    Log::info("Hugging Face Category Result: " . json_encode($result));
                    // Zero-shot usually returns {"labels": [...], "scores": [...]}
                    // But if it returns a list of objects like classification...
                    if (isset($result['labels'][0])) {
                        return $result['labels'][0];
                    }
                    if (isset($result[0]['label'])) {
                        return $result[0]['label'];
                    }
                    return 'Other';
                } elseif ($response->status() === 503 && isset($result['estimated_time'])) {
                    $wait = (int) $result['estimated_time'];
                    Log::warning("HF Category Model loading. Waiting {$wait} seconds...");
                    sleep(min($wait, 10));
                    continue;
                } else {
                    Log::error("Hugging Face Category API failed: " . $response->body());
                    break;
                }
            } catch (\Exception $e) {
                Log::error("Hugging Face Category Error: " . $e->getMessage());
                break;
            }
        }

        return 'Other';
    }

    /**
     * Recommend products based on user goal using AI sentence similarity
     */
    public function recommendProducts(string $userGoal, \Illuminate\Database\Eloquent\Collection $products): array
    {
        if (!$this->token || $products->isEmpty()) {
            return [];
        }

        $sentences = [];
        foreach ($products as $product) {
            $sentences[] = $product->name . " " . ($product->category ?? '');
        }

        $maxRetries = 3;
        $scores = [];

        for ($i = 0; $i < $maxRetries; $i++) {
            try {
                $response = Http::withToken($this->token)
                    ->post("https://router.huggingface.co/hf-inference/models/{$this->embeddingModel}", [
                        'inputs' => [
                            'source_sentence' => $userGoal,
                            'sentences' => $sentences
                        ],
                    ]);

                $result = $response->json();

                if ($response->successful() && is_array($result)) {
                    $scores = $result; // Returns an array of similarity scores (e.g., [0.8, 0.2])
                    break;
                } elseif ($response->status() === 503 && isset($result['estimated_time'])) {
                    $wait = (int) $result['estimated_time'];
                    Log::warning("HF Similarity Model loading. Waiting {$wait} seconds...");
                    sleep(min($wait, 10));
                    continue;
                } else {
                    Log::error("Hugging Face Similarity API failed: " . $response->body());
                    break;
                }
            } catch (\Exception $e) {
                Log::error("Hugging Face Similarity Error: " . $e->getMessage());
                break;
            }
        }

        if (empty($scores) || count($scores) !== count($sentences)) {
            return [];
        }

        $recommendations = [];
        $index = 0;

        foreach ($products as $product) {
            $productData = $product->toArray();
            $productData['similarity_score'] = $scores[$index];
            $recommendations[] = $productData;
            $index++;
        }

        // Sort by similarity score descending
        usort($recommendations, function ($a, $b) {
            return $b['similarity_score'] <=> $a['similarity_score'];
        });

        // Return top 5 recommendations
        return array_slice($recommendations, 0, 5);
    }
}
