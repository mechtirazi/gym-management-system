<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Auth\Access\AuthorizationException;

class UserController extends BaseApiController
{
    public function __construct(UserService $userService)
    {
        $this->configureBase(
            $userService,
            'user',
            StoreUserRequest::class,
            UpdateUserRequest::class
        );
    }

    protected function getModelClass()
    {
        return User::class;
    }

    /**
     * Find a user by email for invitation purposes.
     */
    public function findByEmail(Request $request)
    {
        $email = $request->query('email');
        if (!$email) {
            return response()->json(['success' => false, 'message' => 'Email is required'], 400);
        }

        $user = User::where('email', $email)
            ->whereIn('role', [User::ROLE_TRAINER, User::ROLE_RECEPTIONIST, User::ROLE_MEMBER])
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found or ineligible for staff invitation. Note: Owners and Admins cannot be invited as staff.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id_user'   => $user->id_user,
                'name'      => $user->name,
                'last_name' => $user->last_name,
                'email'     => $user->email,
                'phone'     => $user->phone,
                'role'      => $user->role,
                'profile_picture' => $user->profile_picture
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            // Basic authorization
            $this->authorize('create', User::class);

            // If store request class is defined, validate using it
            if ($this->storeRequest) {
                $validatedData = app($this->storeRequest)->validated();
            } else {
                $validatedData = $request->all();
            }

            // Enforce role-specific creation policy after validation
            if (empty($validatedData['role'])) {
                throw new \InvalidArgumentException('role is required for authorization checks');
            }

            $this->authorize('canCreateRole', [User::class, $validatedData['role']]);

            // Enforce gym-scoped creation when gym id(s) are provided in payload
            $gymIds = $this->extractGymIdsFromPayload($validatedData);
            foreach ($gymIds as $gymId) {
                $this->authorize('canCreateInGym', [User::class, $gymId]);
            }

            $data = $this->service->create($validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => ucfirst($this->modelName) . ' created successfully'
            ], 201);
        } catch (AuthorizationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: ' . $e->getMessage()
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        try {
            $model = $this->findModel($id);
            if (!$model) {
                // If model not found, try to get it via service
                $model = $this->service->getById($id);
            }

            // Check authorization for performing update
            $this->authorize('update', $model);

            // If update request class is defined, validate using it
            if ($this->updateRequest) {
                $validatedData = app($this->updateRequest)->validated();
            } else {
                $validatedData = $request->all();
            }

            // If role is being changed, ensure current user can create that role
            if (!empty($validatedData['role'])) {
                $this->authorize('canCreateRole', [User::class, $validatedData['role']]);
            }

            // If gym assignment is being changed, enforce gym-scoped creation
            $gymIds = $this->extractGymIdsFromPayload($validatedData);
            foreach ($gymIds as $gymId) {
                $this->authorize('canCreateInGym', [User::class, $gymId]);
            }

            $data = $this->service->update($model, $validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => ucfirst($this->modelName) . ' updated successfully'
            ], 200);
        } catch (AuthorizationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: ' . $e->getMessage()
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Extract gym IDs from payload for authorization checks
     *
     * @param array $data
     * @return array
     */
    protected function extractGymIdsFromPayload(array $data): array
    {
        $gymIds = [];

        if (isset($data['id_gym'])) {
            $gymIds[] = $data['id_gym'];
        }

        if (isset($data['gym_id'])) {
            $gymIds[] = $data['gym_id'];
        }

        if (isset($data['gyms']) && is_array($data['gyms'])) {
            foreach ($data['gyms'] as $gym) {
                if (is_array($gym) && isset($gym['id_gym'])) {
                    $gymIds[] = $gym['id_gym'];
                } elseif (is_numeric($gym) || is_string($gym)) {
                    $gymIds[] = $gym;
                }
            }
        }

        return array_unique($gymIds);
    }
}