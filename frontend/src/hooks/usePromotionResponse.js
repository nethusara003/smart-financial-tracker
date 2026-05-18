import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../services/apiClient";
import { queryKeys } from "./queryKeys";

/**
 * Hook for the TARGET USER (regular user, not admin) to accept or decline
 * a promotion invitation that appears in their regular Notification Center.
 */
export function useRespondToPromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, decision }) => {
      return request(`/admin/promotions/${requestId}/respond`, {
        method: "PATCH",
        body: { decision },
        fallbackMessage: "Failed to respond to promotion request",
      });
    },
    onSuccess: () => {
      // Refresh regular notifications (the promotion notification should update)
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      // Also refresh settings/profile since the user's role may have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}
