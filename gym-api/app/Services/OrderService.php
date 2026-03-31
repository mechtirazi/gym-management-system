<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;

class OrderService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Order());
        $this->setRelations(['products', 'member']);
    }

    /**
     * Get all orders filtered by user access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Members only see their own orders
        if ($user->role === User::ROLE_MEMBER) {
            return $query->where('id_member', $user->id_user)->get();
        }

        // Owners and Receptionists: in a real app, orders would likely be tied to a gym.
        // If they aren't directly tied, we might join through members or just allow viewing all for now.
        // Since id_gym is missing from Order, we return all for staff roles.
        if (in_array($user->role, [User::ROLE_OWNER, User::ROLE_RECEPTIONIST, User::ROLE_NUTRITIONIST])) {
            return $query->get();
        }

        return collect();
    }

    /**
     * Get orders by member ID
     */
    public function getOrdersByMemberId(string $memberId)
    {
        return $this->getBy('id_member', $memberId);
    }

    /**
     * Get orders by status
     */
    public function getOrdersByStatus(string $status)
    {
        return $this->getBy('status', $status);
    }

    /**
     * Create a new order with products
     */
    public function create(array $data): \Illuminate\Database\Eloquent\Model
    {
        $products = $data['products'] ?? [];
        unset($data['products']);

        // Default total amount if not provided
        if (!isset($data['total_amount'])) {
            $data['total_amount'] = 0;
        }

        $order = $this->model->create($data);

        if (!empty($products)) {
            $total = 0;
            foreach ($products as $product) {
                $qty = $product['quantity'] ?? 1;
                $price = $product['price'] ?? 0;
                $total += $qty * $price;

                $order->products()->attach($product['id_product'], [
                    'id' => \Illuminate\Support\Str::uuid(), // In case pivot uses UUIDs
                    'quantity' => $qty,
                    'price' => $price
                ]);

                // Decrement product stock
                $productModel = clone $this->model; // Just to make sure we don't pollute
                \App\Models\Product::where('id_product', $product['id_product'])->decrement('stock', $qty);
            }
            
            // Update total if not explicitly set
            if ($data['total_amount'] == 0) {
               $order->update(['total_amount' => $total]);
            }
        }

        return $order->fresh($this->relations);
    }
}
