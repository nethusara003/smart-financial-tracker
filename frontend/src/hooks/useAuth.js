import { useMutation } from "@tanstack/react-query";
import { getAuthToken, request } from "../services/apiClient";

export function useLogin() {
  return useMutation({
    mutationFn: async ({ email, password }) => {
      return request("/users/login", {
        method: "POST",
        auth: false,
        body: { email, password },
        fallbackMessage: "Login failed",
      });
    },
  });
}

export function useGoogleLogin() {
  return useMutation({
    mutationFn: async ({ credential }) => {
      return request("/users/google-login", {
        method: "POST",
        auth: false,
        body: { credential },
        fallbackMessage: "Google Sign-In failed",
      });
    },
  });
}

export function useGuestLogin() {
  return useMutation({
    mutationFn: async () => {
      return request("/users/guest-login", {
        method: "POST",
        auth: false,
        fallbackMessage: "Failed to create guest session",
      });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({ name, email, password }) => {
      return request("/users/register", {
        method: "POST",
        auth: false,
        body: { name, email, password },
        fallbackMessage: "Registration failed",
      });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async ({ email }) => {
      return request("/users/forgot-password", {
        method: "POST",
        auth: false,
        body: { email },
        fallbackMessage: "Failed to send reset link",
      });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, newPassword }) => {
      return request("/users/reset-password", {
        method: "POST",
        auth: false,
        body: { token, newPassword },
        fallbackMessage: "Password reset failed",
      });
    },
  });
}

export async function fetchCurrentUserProfile() {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  try {
    const payload = await request("/users/profile", {
      fallbackMessage: "Failed to load user profile",
    });
    return payload?.user || null;
  } catch (error) {
    if (error.status === 401) {
      return null;
    }

    throw error;
  }
}
