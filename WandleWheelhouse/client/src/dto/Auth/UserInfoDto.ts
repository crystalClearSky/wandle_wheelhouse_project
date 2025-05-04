// src/dto/Auth/UserInfoDto.ts

export interface UserInfoDto {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  avatarUrl?: string | null; // <-- Ensure this line exists and is saved
}