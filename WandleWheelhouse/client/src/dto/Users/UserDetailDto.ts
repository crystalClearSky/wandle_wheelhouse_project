// Location: src/dto/Users/UserDetailDto.ts

// Represents the detailed user information received from endpoints
// like /api/admin/users/{userId} or /api/users/me/profile
export interface UserDetailDto {
    id: string; // User ID (GUID as string)
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
    emailConfirmed: boolean;
    lockoutEnabled: boolean;
    lockoutEnd?: string | null; // DateTimeOffset often serialized as ISO string
  
    // Address fields
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postCode?: string | null;
    country?: string | null;
  
    // Roles assigned to the user
    roles: string[];
  
    // Avatar URL (relative path from backend)
    avatarUrl?: string | null;
  }