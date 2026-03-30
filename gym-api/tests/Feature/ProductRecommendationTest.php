<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProductRecommendationTest extends TestCase
{
    use RefreshDatabase;

    public function test_recommend_products_based_on_goal()
    {
        // Setup User
        $user = User::factory()->create();

        // Setup Products
        $product1 = Product::factory()->create([
            'name' => 'Yoga Mat',
            'category' => 'Equipment',
            'stock' => 10,
        ]);
        $product2 = Product::factory()->create([
            'name' => 'Whey Protein',
            'category' => 'Supplement',
            'stock' => 20,
        ]);

        // Mock Hugging Face API
        Http::fake([
            'router.huggingface.co/*' => Http::response([
                // Dummy similarity scores: Yoga Mat is highly similar, Whey Protein is not
                0.95, // Yoga Mat
                0.12  // Whey Protein
            ], 200),
        ]);

        $response = $this->actingAs($user, 'api')->postJson('/api/products/recommend', [
            'goal' => 'I do yoga',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'data' => [
                '*' => [
                    'id_product',
                    'name',
                    'category',
                    'similarity_score',
                ]
            ]
        ]);

        $data = $response->json('data');

        $this->assertCount(2, $data);
        
        // Ensure Yoga Mat is the first recommendation (highest similarity)
        $this->assertEquals($product1->id_product, $data[0]['id_product']);
        $this->assertEquals($product2->id_product, $data[1]['id_product']);
        $this->assertTrue($data[0]['similarity_score'] > $data[1]['similarity_score']);
    }

    public function test_recommend_without_auth()
    {
        $response = $this->postJson('/api/products/recommend', [
            'goal' => 'I do yoga',
        ]);

        $response->assertStatus(401);
    }
}
