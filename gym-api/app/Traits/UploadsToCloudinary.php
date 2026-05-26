<?php

namespace App\Traits;

use Illuminate\Http\UploadedFile;

trait UploadsToCloudinary
{
    /**
     * Upload a file to Cloudinary using the SDK directly.
     * Falls back to local public storage if credentials are missing.
     *
     * @param  UploadedFile  $file
     * @param  string        $folder  Cloudinary folder name
     * @return string        Secure URL (Cloudinary) or relative path (local fallback)
     */
    protected function uploadToCloudinary(UploadedFile $file, string $folder): string
    {
        $cloudName  = env('CLOUDINARY_CLOUD_NAME');
        $apiKey     = env('CLOUDINARY_API_KEY');
        $apiSecret  = env('CLOUDINARY_API_SECRET');

        if ($cloudName && $apiKey && $apiSecret) {
            $cloudinary = new \Cloudinary\Cloudinary([
                'cloud' => [
                    'cloud_name' => $cloudName,
                    'api_key'    => $apiKey,
                    'api_secret' => $apiSecret,
                ],
                'url' => ['secure' => true],
            ]);

            $result = $cloudinary->uploadApi()->upload(
                $file->getRealPath(),
                ['folder' => $folder]
            );

            return $result['secure_url'];
        }

        // Fallback: store locally (dev only — not persistent on Railway)
        \Log::warning("Cloudinary credentials missing — falling back to local storage for folder: {$folder}");
        return $file->store($folder, 'public');
    }
}
