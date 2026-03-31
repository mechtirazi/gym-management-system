export function extractApiList<T>(response: any): T[] {
  const payload = response?.data ?? response ?? [];
  return Array.isArray(payload) ? payload : [];
}

export function isMemberUser(user: any): boolean {
  return user?.role === 'member' && !!user?.id_user;
}

export function isOwnedByNutritionist(plan: any, nutritionistId?: string): boolean {
  if (!nutritionistId) return false;
  const planNutritionistId =
    plan?.id_nutritionist ??
    plan?.nutritionist?.id_user ??
    plan?.nutritionist?.id ??
    '';

  return String(planNutritionistId).toLowerCase() === String(nutritionistId).toLowerCase();
}

