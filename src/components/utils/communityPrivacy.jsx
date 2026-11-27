/**
 * communityPrivacy — single source of truth for community privacy rules.
 *
 * Decisions encoded here:
 *  - Every registered collector can use the community, whatever their privacy.
 *  - profile_visibility 'private' means the full profile is visible to accepted friends only.
 *  - messaging_permission gates NEW conversations only; existing threads are retained.
 *  - Friend requests are allowed independently of messaging.
 *  - Each collection module can be shared or withheld individually.
 *
 * Legacy fields (is_public / enable_messaging) are still read for rows written
 * before these settings existed, and mirrored on save so older readers agree.
 */

export const COLLECTION_MODULES = [
  { key: "pipekeeper", labelKey: "modules.pipekeeper", fallback: "Pipes" },
  { key: "tobacco", labelKey: "modules.tobacco", fallback: "Tobacco" },
  { key: "whiskeykeeper", labelKey: "modules.whiskeykeeper", fallback: "Whiskey" },
  { key: "cigarkeeper", labelKey: "modules.cigarkeeper", fallback: "Cigars" },
  { key: "winekeeper", labelKey: "modules.winekeeper", fallback: "Wine" },
];

export const ALL_MODULE_KEYS = COLLECTION_MODULES.map((m) => m.key);

/** Applied when a collector has never chosen anything. */
export const DEFAULT_COMMUNITY_PRIVACY = {
  profile_visibility: "private",
  messaging_permission: "disabled",
  friend_requests_enabled: true,
  shared_modules: ALL_MODULE_KEYS,
  // legacy mirrors
  is_public: false,
  enable_messaging: false,
};

export const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export function normalizeCommunityPrivacy(profile) {
  const rawVisibility = profile?.profile_visibility;
  const visibility =
    rawVisibility === "public" || rawVisibility === "private"
      ? rawVisibility
      : profile?.is_public === true
        ? "public"
        : "private";

  const rawMessaging = profile?.messaging_permission;
  const messaging = ["everyone", "friends", "disabled"].includes(rawMessaging)
    ? rawMessaging
    : // Legacy rows only had a yes/no flag and could only reach accepted
      // friends, so a legacy "on" maps to friends-only.
      profile?.enable_messaging === true
      ? "friends"
      : "disabled";

  const friendRequests =
    typeof profile?.friend_requests_enabled === "boolean" ? profile.friend_requests_enabled : true;

  const sharedModules =
    Array.isArray(profile?.shared_modules) && profile.shared_modules.length > 0
      ? profile.shared_modules
      : ALL_MODULE_KEYS;

  return { visibility, messaging, friendRequests, sharedModules };
}

export function isModuleShared(profile, moduleKey) {
  if (!moduleKey) return true;
  return normalizeCommunityPrivacy(profile).sharedModules.includes(moduleKey);
}

export function areFriends(friendships, emailA, emailB) {
  const a = normalizeEmail(emailA);
  const b = normalizeEmail(emailB);
  if (!a || !b || a === b) return false;
  return (friendships || []).some((link) => {
    if (link?.status !== "accepted") return false;
    const requester = normalizeEmail(link.requester_email);
    const recipient = normalizeEmail(link.recipient_email);
    return (requester === a && recipient === b) || (requester === b && recipient === a);
  });
}

export function hasPendingRequest(friendships, fromEmail, toEmail) {
  const from = normalizeEmail(fromEmail);
  const to = normalizeEmail(toEmail);
  return (friendships || []).some(
    (link) =>
      link?.status === "pending" &&
      normalizeEmail(link.requester_email) === from &&
      normalizeEmail(link.recipient_email) === to
  );
}

/** Can this viewer open the collector's full profile? */
export function canViewProfile(profile, { viewerEmail, ownerEmail, friendships } = {}) {
  const owner = normalizeEmail(ownerEmail ?? profile?.user_email);
  const viewer = normalizeEmail(viewerEmail);
  if (!owner) return false;
  if (viewer && viewer === owner) return true;
  const { visibility } = normalizeCommunityPrivacy(profile);
  if (visibility === "public") return true;
  return areFriends(friendships, viewer, owner);
}

/** Can this viewer start a NEW conversation with the collector? */
export function canMessage(profile, { viewerEmail, ownerEmail, friendships } = {}) {
  const owner = normalizeEmail(ownerEmail ?? profile?.user_email);
  const viewer = normalizeEmail(viewerEmail);
  if (!owner || !viewer || viewer === owner) return false;
  const { messaging } = normalizeCommunityPrivacy(profile);
  if (messaging === "disabled") return false;
  if (messaging === "everyone") return true;
  return areFriends(friendships, viewer, owner);
}

/** Can this viewer send a friend request? Independent of messaging. */
export function canSendFriendRequest(profile, { viewerEmail, ownerEmail } = {}) {
  const owner = normalizeEmail(ownerEmail ?? profile?.user_email);
  const viewer = normalizeEmail(viewerEmail);
  if (!owner || !viewer || viewer === owner) return false;
  return normalizeCommunityPrivacy(profile).friendRequests;
}

/** Shape a settings form into the fields that get persisted. */
export function buildPrivacyPayload({ visibility, messaging, friendRequests, sharedModules }) {
  return {
    profile_visibility: visibility === "public" ? "public" : "private",
    messaging_permission: ["everyone", "friends", "disabled"].includes(messaging)
      ? messaging
      : "disabled",
    friend_requests_enabled: !!friendRequests,
    shared_modules: Array.isArray(sharedModules) ? sharedModules : ALL_MODULE_KEYS,
    is_public: visibility === "public",
    enable_messaging: messaging !== "disabled",
  };
}