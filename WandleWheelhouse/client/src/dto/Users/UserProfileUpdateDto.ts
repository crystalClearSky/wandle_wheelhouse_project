// src/dto/Users/UserProfileUpdateDto.ts
// Matches the backend DTO for updating user profile details

export interface UserProfileUpdateDto {
    // All fields are optional for partial updates
    firstName?: string | null;
    lastName?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postCode?: string | null;
    country?: string | null;
    // Do NOT include fields like Email, Password here.
    // Those should have separate, dedicated update processes if needed.
  }