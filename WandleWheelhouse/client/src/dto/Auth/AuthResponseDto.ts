// Matches the AuthResponseDto class in the backend
import { UserInfoDto } from './UserInfoDto'; // Import the related DTO

export interface AuthResponseDto {
  isSuccess: boolean;
  message?: string | null; // Optional message string
  token?: string | null; // The JWT token (only present on successful login)
  tokenExpiration?: string | null; // Expiration date as an ISO string or null
  userInfo?: UserInfoDto | null; // User details (only present on successful login)
}