import { UserInfoDto } from './UserInfoDto';

export * from './UserInfoDto'; // Re-export UserInfoDto

export interface AuthResponseDto {
  isSuccess: boolean;
  message?: string | null;
  token?: string | null;
  tokenExpiration?: string | null;
  userInfo?: UserInfoDto | null;
}