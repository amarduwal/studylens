'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { User, Upload, X, Loader2, Camera } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/components/ui/toast';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  className?: string;
  onAvatarChange?: (newAvatarUrl: string | null) => void;
}

export default function AvatarUpload({
  currentAvatarUrl,
  userName,
  size = 'lg',
  editable = true,
  className = '',
  onAvatarChange,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showToast, ToastComponent } = useToast();

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-16 h-16',
      icon: 'h-6 w-6',
      button: 'h-7 w-7',
      text: 'text-xs',
    },
    md: {
      container: 'w-20 h-20',
      icon: 'h-8 w-8',
      button: 'h-8 w-8',
      text: 'text-sm',
    },
    lg: {
      container: 'w-24 h-24',
      icon: 'h-10 w-10',
      button: 'h-9 w-9',
      text: 'text-base',
    },
    xl: {
      container: 'w-32 h-32',
      icon: 'h-12 w-12',
      button: 'h-10 w-10',
      text: 'text-lg',
    },
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      showToast(
        'Please select a valid image (JPEG, PNG, WebP, or GIF)',
        'error'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB', 'error');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);

    try {
      // Upload to server
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Update the user's avatar in database
        const updateResponse = await fetch('/api/user/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            avatarUrl: result.data.avatarUrl,
          }),
        });

        const updateResult = await updateResponse.json();

        if (updateResult.success) {
          showToast('Profile picture updated successfully', 'success');
          onAvatarChange?.(result.data.avatarUrl);
          setPreviewUrl(null);
        } else {
          showToast(updateResult.error || 'Failed to update profile', 'error');
        }
      } else {
        showToast(result.error || 'Upload failed', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload image', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemoving(true);
    try {
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showToast('Profile picture removed', 'success');
        onAvatarChange?.(null);
        setPreviewUrl(null);
      } else {
        showToast(result.error || 'Failed to remove profile picture', 'error');
      }
    } catch (error) {
      console.error('Remove error:', error);
      showToast('Failed to remove profile picture', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;
  const config = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative group">
        {/* Avatar Container */}
        <div
          className={`
            ${config.container}
            rounded-full flex items-center justify-center
            border-2 border-[hsl(var(--border))]
            overflow-hidden
            bg-gradient-to-br from-[hsl(var(--primary))]/10 to-[hsl(var(--primary))]/5
            transition-all duration-200
            ${editable ? 'group-hover:border-[hsl(var(--primary))]' : ''}
          `}
        >
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={`${userName || 'User'}'s profile`}
              fill
              className="object-cover rounded-full"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <User
                className={`${config.icon} text-[hsl(var(--primary))] mb-1`}
              />
            </div>
          )}

          {/* Upload Overlay */}
          {editable && (
            <div
              className={`
                absolute inset-0 bg-black/60
                flex items-center justify-center
                rounded-full
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
                cursor-pointer
                ${isUploading || isRemoving ? 'opacity-100' : ''}
              `}
              onClick={handleFileSelect}
            >
              {isUploading ? (
                <Loader2 className={`${config.icon} animate-spin text-white`} />
              ) : (
                <Camera className={`${config.icon} text-white`} />
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {editable && (
          <>
            {/* Change Button (bottom right) */}
            <Button
              type="button"
              size="icon"
              variant="default"
              className={`
                absolute -bottom-2 -right-2
                rounded-full shadow-lg
                ${config.button}
                transition-all duration-200
                hover:scale-110
                ${isUploading || isRemoving ? 'opacity-50' : ''}
              `}
              onClick={handleFileSelect}
              disabled={isUploading || isRemoving}
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
            </Button>

            {/* Remove Button (only when avatar exists) */}
            {displayUrl && (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className={`
                  absolute -bottom-2 -left-2
                  rounded-full shadow-lg
                  ${config.button}
                  transition-all duration-200
                  hover:scale-110
                  ${isRemoving ? 'opacity-50' : ''}
                `}
                onClick={handleRemoveAvatar}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      {/* Instructions */}
      {editable && (
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">
            {displayUrl ? 'Update your photo' : 'Add a profile photo'}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-xs">
            Click the upload button to change your profile picture
            <br />
            JPG, PNG, WebP, GIF • Max 5MB
          </p>
        </div>
      )}
      {ToastComponent}
    </div>
  );
}
