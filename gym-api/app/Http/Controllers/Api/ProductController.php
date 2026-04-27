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

    public function store(Request $request)
    {
        try {
            $this->authorize('create', Product::class);
            $validatedData = app(StoreProductRequest::class)->validated();

            if ($request->hasFile('image')) {
                $path = $request->file('image')->store('products', 'public');
                $validatedData['image'] = '/storage/' . $path;
            }

            $data = $this->service->create($validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Product created successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating product: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $model = $this->findModel($id);
            if (!$model)
                $model = $this->service->getById($id);

            if ($model) {
                $this->authorize('update', $model);
            }

            $validatedData = app(UpdateProductRequest::class)->validated();

            if ($request->hasFile('image')) {
                $path = $request->file('image')->store('products', 'public');
                $validatedData['image'] = '/storage/' . $path;
            }

            $data = $this->service->update($model, $validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Product updated successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating product: ' . $e->getMessage(),
            ], 500);
        }
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
