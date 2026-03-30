<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Product;
use App\Services\ProductService;
use App\Services\AIService;
use Illuminate\Http\Request;

class ProductController extends BaseApiController
{
    public function __construct(ProductService $productService)
    {
        $this->configureBase(
            $productService,
            'product',
            StoreProductRequest::class,
            UpdateProductRequest::class
        );
    }

    protected function getModelClass()
    {
        return Product::class;
    }

    public function recommend(Request $request, AIService $aiService)
    {
        $request->validate([
            'goal' => 'required|string|min:3',
        ]);

        // Only recommend products that are in stock
        $products = Product::where('stock', '>', 0)->get();
        
        $recommendations = $aiService->recommendProducts($request->input('goal'), $products);

        return response()->json([
            'status' => 'success',
            'data' => $recommendations,
        ]);
    }

    public function orders(Product $product)
    {
        // Authorization: if owner can view the product, they can see its orders
        $this->authorize('view', $product);

        $orders = $product->orders()->with('member')->get();

        return response()->json([
            'success' => true,
            'data' => $orders,
            'message' => 'Orders retrieved successfully',
        ], 200);
    }
}
