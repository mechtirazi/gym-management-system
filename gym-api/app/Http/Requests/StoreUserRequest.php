<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\User;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Disabled authorization for now
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = auth()->user();
        $validRoles = implode(',', User::VALID_ROLES);

        // Super admin can only create owners
        if ($user && $user->role === 'super_admin') {
            return [
                'name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
                'role' => 'required|string|in:owner',
                'phone' => 'required|string|max:20',
                'creation_date' => 'required|date',
                'profile_picture' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            ];
        }

        // Owner can create trainer, member, nutritionist, receptionist (NOT owner)
        if ($user && $user->role === 'owner') {
            return [
                'name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
                'role' => 'required|string|in:trainer,member,nutritionist,receptionist',
                'phone' => 'required|string|max:20',
                'creation_date' => 'required|date',
                'profile_picture' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            ];
        }

        // Default for unauthenticated or other users
        return [
            'name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => "required|string|in:{$validRoles}",
            'phone' => 'required|string|max:20',
            'creation_date' => 'nullable|date',
            'profile_picture' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     */
    public function messages(): array
    {
        $messages = [
            'name.required' => 'The name field is required.',
            'last_name.required' => 'The last name field is required.',
            'email.required' => 'The email field is required.',
            'email.email' => 'The email must be a valid email address.',
            'email.unique' => 'This email has already been registered.',
            'password.required' => 'The password field is required.',
            'password.min' => 'The password must be at least 6 characters.',
            'role.required' => 'The role field is required.',
            'phone.required' => 'The phone field is required.',
            'creation_date.required' => 'The creation date field is required.',
            'profile_picture.image' => 'The profile picture must be an image.',
            'profile_picture.mimes' => 'The profile picture must be a file of type: jpeg, png, jpg, gif.',
        ];

        $messages['role.in'] = $this->getRoleErrorMessage();

        return $messages;
    }

    /**
     * Get role.in error message based on authenticated user role
     */
    private function getRoleErrorMessage(): string
    {
        $user = auth()->user();

        if ($user && $user->role === 'owner') {
            return 'Owners can only create trainer, member, nutritionist, or receptionist.';
        }

        if ($user && $user->role === 'super_admin') {
            return 'Super admin can only create owners.';
        }

        return 'Invalid role selected.';
    }
}
