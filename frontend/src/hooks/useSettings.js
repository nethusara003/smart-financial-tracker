import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth, getAuthToken } from "../services/apiClient";
import { queryKeys } from "./queryKeys";

const EMPTY_PROFILE = {
  name: localStorage.getItem("userName") || "",
  email: localStorage.getItem("userEmail") || "",
  phone: "",
  bio: "",
  profilePicture: "",
  notificationSettings: null,
  privacySettings: null,
  accountNumber: "",
};

const EMPTY_TRANSFER_PIN_STATUS = {
  hasPin: false,
};

async function parseApiError(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);
  return payload?.message || fallbackMessage;
}

async function fetchSettingsProfile() {
  const token = getAuthToken();

  if (!token) {
    return EMPTY_PROFILE;
  }

  const response = await fetchWithAuth("/users/profile");

  if (response.status === 401) {
    return EMPTY_PROFILE;
  }

  if (!response.ok) {
    const message = await parseApiError(response, `Failed to load profile (${response.status})`);
    throw new Error(message);
  }

  const payload = await response.json();
  const user = payload?.user || {};

  return {
    name: user.name || EMPTY_PROFILE.name,
    email: user.email || EMPTY_PROFILE.email,
    phone: user.phone || "",
    bio: user.bio || "",
    profilePicture: user.profilePicture || "",
    notificationSettings: user.notificationSettings || null,
    privacySettings: user.privacySettings || null,
    accountNumber: user.accountNumber || "",
  };
}

async function fetchTransferPinStatus() {
  const token = getAuthToken();

  if (!token) {
    return EMPTY_TRANSFER_PIN_STATUS;
  }

  const response = await fetchWithAuth("/users/check-transfer-pin");

  if (response.status === 401) {
    return EMPTY_TRANSFER_PIN_STATUS;
  }

  if (!response.ok) {
    const message = await parseApiError(response, `Failed to load transfer PIN status (${response.status})`);
    throw new Error(message);
  }

  const payload = await response.json();

  return {
    hasPin: Boolean(payload?.hasPin),
  };
}

export function useSettingsProfile({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.settings.profile,
    queryFn: fetchSettingsProfile,
    enabled,
    placeholderData: EMPTY_PROFILE,
  });
}

export function useTransferPinStatus({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.settings.transferPinStatus,
    queryFn: fetchTransferPinStatus,
    enabled,
    placeholderData: EMPTY_TRANSFER_PIN_STATUS,
  });
}

export function useUpdateProfileSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await fetchWithAuth("/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await parseApiError(response, "Failed to update profile");
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile });
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationSettings) => {
      const response = await fetchWithAuth("/users/notification-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationSettings }),
      });

      if (!response.ok) {
        const message = await parseApiError(response, "Failed to save notification settings");
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile });
    },
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (privacySettings) => {
      const response = await fetchWithAuth("/users/privacy-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ privacySettings }),
      });

      if (!response.ok) {
        const message = await parseApiError(response, "Failed to save privacy settings");
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile });
    },
  });
}

export function useUpdateCurrencySetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (currency) => {
      const response = await fetchWithAuth("/users/update-currency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currency }),
      });

      if (!response.ok) {
        const message = await parseApiError(response, "Failed to update currency");
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile });
    },
  });
}

export function useChangePasswordSetting() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const response = await fetchWithAuth("/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const message = await parseApiError(response, "Failed to change password");
        throw new Error(message);
      }

      return response.json();
    },
  });
}

export function useExportUserData() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetchWithAuth("/users/export-data", {
        method: "GET",
      });

      if (!response.ok) {
        const message = await parseApiError(response, "Failed to export data");
        throw new Error(message);
      }

      return response.json();
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (password) => {
      const response = await fetchWithAuth("/users/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const message = await parseApiError(response, "Failed to delete account");
        throw new Error(message);
      }

      return response.json();
    },
  });
}

export function useSetTransferPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ currentPin, newPin, confirmPin }) => {
      const response = await fetchWithAuth("/users/set-transfer-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });

      if (!response.ok) {
        const message = await parseApiError(response, "Failed to set transfer PIN");
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.transferPinStatus });
    },
  });
}
