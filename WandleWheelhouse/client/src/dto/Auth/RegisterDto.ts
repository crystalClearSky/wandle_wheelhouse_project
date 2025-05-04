// Matches the RegisterDto class in the backend

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;

  // Optional fields matching the backend DTO
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postCode?: string | null;
  country?: string | null;
}
