// src/components/ui/Avatar.tsx
import React from 'react';
import { getInitials } from '../../lib/utils/getInitials'; // Adjust path if needed

interface AvatarProps {
  name?: string | null;
  imageUrl?: string | null; // Expecting relative path like /uploads/avatars/...
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Get the API origin from environment variables (provide a fallback just in case)
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 'sm', className = '' }) => {
  const initials = getInitials(name);

  let sizeClasses = '';
  let textSizeClass = '';
  switch (size) {
    case 'lg': sizeClasses = 'w-16 h-16'; textSizeClass = 'text-xl'; break;
    case 'md': sizeClasses = 'w-10 h-10'; textSizeClass = 'text-base'; break;
    case 'sm': default: sizeClasses = 'w-6 h-6'; textSizeClass = 'text-xs'; break;
  }

    // --- Construct Full Image URL ---
    // Prepend the API origin only if imageUrl is a relative path starting with '/'
    const fullImageUrl = imageUrl && imageUrl.startsWith('/')
        ? `${API_ORIGIN}${imageUrl}` // <--- CORRECTED LINE
        : imageUrl; // Use imageUrl directly if it's already absolute or null/undefined
    // --- End Construct Full Image URL ---

  // Log the URL being used for debugging
  if (imageUrl) {
      console.log("Avatar attempting to load:", fullImageUrl);
  }

  return (
    <div
      title={name || 'User Avatar'}
      className={`inline-flex items-center justify-center ${sizeClasses} rounded-full bg-indigo-500 ${textSizeClass} font-semibold text-white leading-none overflow-hidden ${className}`}
    >
      {/* Use the fullImageUrl in the src attribute */}
      {fullImageUrl ? (
        <img
          src={fullImageUrl} // <-- Use the potentially modified URL
          alt={name || 'User Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
             console.error("Avatar image failed to load:", fullImageUrl, e);
             // Hide the broken image element
             (e.target as HTMLImageElement).style.display = 'none';
             // TODO: Find a way to display initials again as fallback inside the div if needed
          }}
        />
      ) : (
        <span>{initials}</span> // Fallback to initials
      )}
    </div>
  );
};

export default Avatar;