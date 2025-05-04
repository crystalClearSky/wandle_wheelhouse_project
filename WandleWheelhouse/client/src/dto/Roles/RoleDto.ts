// Location: src/dto/Roles/RoleDto.ts

// Represents the basic information about an available role
export interface RoleDto {
    id: string;   // The role's unique identifier (GUID as string)
    name: string; // The role's name (e.g., "Administrator", "Editor", "Member")
  }