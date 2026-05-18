import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken, request } from "../services/apiClient";
import { queryKeys } from "./queryKeys";

async function fetchAdminUsers() {
  const token = getAuthToken();

  if (!token) {
    return [];
  }

  try {
    const payload = await request("/admin/users", {
      fallbackMessage: "Failed to load users",
    });
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    if (error.status === 401) {
      return [];
    }

    throw error;
  }
}

async function fetchAdminAnalyticsOverview() {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  try {
    return await request("/admin/analytics/overview", {
      fallbackMessage: "Failed to load admin analytics",
    });
  } catch (error) {
    if (error.status === 401) {
      return null;
    }

    throw error;
  }
}

async function fetchAdminAuditLogs() {
  const token = getAuthToken();

  if (!token) {
    return [];
  }

  try {
    const payload = await request("/admin/audit-logs", {
      fallbackMessage: "Failed to load audit logs",
    });
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    if (error.status === 401) {
      return [];
    }

    throw error;
  }
}

async function fetchAdminUserTransactions(userId) {
  if (!userId) {
    return [];
  }

  const token = getAuthToken();

  if (!token) {
    return [];
  }

  try {
    const payload = await request(`/admin/users/${userId}/transactions`, {
      fallbackMessage: "Failed to load transactions",
    });
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    if (error.status === 401) {
      return [];
    }

    throw error;
  }
}

function useInvalidateAdminQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  };
}

export function useAdminUsers({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: fetchAdminUsers,
    enabled,
    placeholderData: [],
  });
}

export function useAdminAnalyticsOverview({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.admin.analyticsOverview,
    queryFn: fetchAdminAnalyticsOverview,
    enabled,
    placeholderData: null,
  });
}

export function useAdminAuditLogs({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.admin.auditLogs,
    queryFn: fetchAdminAuditLogs,
    enabled,
    placeholderData: [],
  });
}

export function useAdminUserTransactions(userId, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.admin.userTransactions(userId),
    queryFn: () => fetchAdminUserTransactions(userId),
    enabled: enabled && Boolean(userId),
    placeholderData: [],
  });
}

export function usePromoteUser() {
  const invalidateAdminQueries = useInvalidateAdminQueries();

  return useMutation({
    mutationFn: async ({ userId, reason }) => {
      return request("/admin/promotions/request", {
        method: "POST",
        body: { userId, reason },
        fallbackMessage: "Failed to submit promotion request",
      });
    },
    onSuccess: invalidateAdminQueries,
  });
}

export function useDemoteUser() {
  const invalidateAdminQueries = useInvalidateAdminQueries();

  return useMutation({
    mutationFn: async (userId) => {
      return request(`/admin/demote/${userId}`, {
        method: "PATCH",
        fallbackMessage: "Failed to update user role",
      });
    },
    onSuccess: invalidateAdminQueries,
  });
}

export function useAcceptAdminInvite() {
  return useMutation({
    mutationFn: async ({ token }) => {
      return request("/admin/accept-invite", {
        method: "POST",
        auth: false,
        body: { token },
        fallbackMessage: "Failed to accept invitation",
      });
    },
  });
}
