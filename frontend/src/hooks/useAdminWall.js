import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken, request } from "../services/apiClient";
import { queryKeys } from "./queryKeys";

/* =========================
   FETCH HELPERS
========================= */
async function fetchAdminWallNotifications() {
  const token = getAuthToken();
  if (!token) return { notifications: [], unreadCount: 0 };

  try {
    return await request("/admin/wall-notifications", {
      fallbackMessage: "Failed to load admin notifications",
    });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { notifications: [], unreadCount: 0 };
    }
    throw error;
  }
}

async function fetchPromotionRequests(status) {
  const token = getAuthToken();
  if (!token) return [];

  try {
    const endpoint = status
      ? `/admin/promotions?status=${status}`
      : "/admin/promotions";
    const payload = await request(endpoint, {
      fallbackMessage: "Failed to load promotion requests",
    });
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return [];
    }
    throw error;
  }
}

/* =========================
   INVALIDATION HELPER
========================= */
function useInvalidateAdminWall() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.wallNotifications });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.promotionRequests });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.auditLogs });
  };
}

/* =========================
   QUERIES
========================= */
export function useAdminWallNotifications(options = {}) {
  const { enabled = true, refetchInterval = false, ...rest } = options;

  return useQuery({
    queryKey: queryKeys.admin.wallNotifications,
    queryFn: fetchAdminWallNotifications,
    enabled,
    placeholderData: { notifications: [], unreadCount: 0 },
    refetchInterval,
    ...rest,
  });
}

export function useAdminPromotionRequests(status, options = {}) {
  const { enabled = true, ...rest } = options;

  return useQuery({
    queryKey: [...queryKeys.admin.promotionRequests, status || "all"],
    queryFn: () => fetchPromotionRequests(status),
    enabled,
    placeholderData: [],
    ...rest,
  });
}

/* =========================
   MUTATIONS
========================= */
export function useRequestPromotion() {
  const invalidate = useInvalidateAdminWall();

  return useMutation({
    mutationFn: async ({ userId, reason }) => {
      return request("/admin/promotions/request", {
        method: "POST",
        body: { userId, reason },
        fallbackMessage: "Failed to submit promotion request",
      });
    },
    onSuccess: invalidate,
  });
}

export function useReviewPromotion() {
  const invalidate = useInvalidateAdminWall();

  return useMutation({
    mutationFn: async ({ requestId, decision }) => {
      return request(`/admin/promotions/${requestId}/review`, {
        method: "PATCH",
        body: { decision },
        fallbackMessage: "Failed to review promotion request",
      });
    },
    onSuccess: invalidate,
  });
}

export function useMarkAdminWallRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      return request(`/admin/wall-notifications/${notificationId}/read`, {
        method: "PATCH",
        fallbackMessage: "Failed to mark notification as read",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.wallNotifications });
    },
  });
}
