import type { Role } from "@prisma/client"

export type ApiErrorResponse = {
  error: string
  detail?: string | null
  tokenStatus?: string
  expiresAt?: string | null
}

export type ProfileResponse = {
  id: string
  email: string
  name: string
  role: Role
  avatarUrl: string | null
}

export type UpdateProfileRequest = {
  name?: string
  password?: string
  avatarUrl?: string | null
}

export type UpdateProfileResponse = {
  success: true
  user: ProfileResponse
}

export type UserListItem = {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: string
}

export type RegisterUserRequest = {
  name: string
  email: string
  password: string
  role: Role
}

export type RegisterUserResponse = {
  success: true
  user: Omit<UserListItem, "createdAt">
}

export type UsersListResponse = {
  users: UserListItem[]
}
