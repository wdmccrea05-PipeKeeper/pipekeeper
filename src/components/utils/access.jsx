// src/components/utils/access.jsx

export function isTrialWindow(createdDate) {
  if (!createdDate) return false;
  const start = new Date(createdDate);
  const now = new Date();
  const diffDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

export function isTrialWindowNow(user) {
  // Prefer created_date if present (entities.User), else createdDate-ish fields
  const created =
    user?.created_date ||
    user?.createdDate ||
    user?.created_at ||
    null;

  return isTrialWindow(created);
}