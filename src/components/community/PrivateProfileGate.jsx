import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, UserPlus, Clock } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

/**
 * Shown instead of a private collector's profile body when the viewer is not
 * an accepted friend. Keeps the collector discoverable and lets a friend
 * request be sent without exposing the collection.
 */
export default function PrivateProfileGate({
  profile,
  profileOwner,
  canRequest,
  requestPending,
  onAddFriend,
  isAdding,
}) {
  const { t } = useTranslation();
  const avatarSrc = profile?.avatar_url || profileOwner?.avatar_url;
  const displayName = profile?.display_name || profile?.user_email || "";

  return (
    <Card className="bg-white/95 max-w-md mx-auto">
      <CardContent className="p-8 text-center">
        <Avatar className="w-20 h-20 mx-auto mb-4">
          <AvatarImage src={avatarSrc} />
          <AvatarFallback className="bg-amber-200 text-amber-800 text-2xl">
            {displayName?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-semibold text-stone-800 mb-1">{displayName}</h2>
        <div className="flex items-center justify-center gap-2 text-stone-500 mb-3">
          <Lock className="w-4 h-4" />
          <span className="text-sm">
            {t("communityPrivacy.privateProfileTitle", "This profile is private")}
          </span>
        </div>
        <p className="text-stone-600 mb-5 text-sm">
          {t(
            "communityPrivacy.privateProfileDesc",
            "Only accepted friends can see this collector's profile and collections."
          )}
        </p>

        {canRequest && !requestPending && (
          <Button
            onClick={onAddFriend}
            disabled={isAdding}
            className="bg-[#705d39] hover:bg-[#8C4A4A] text-[#F5F1E7] w-full"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t("communityPrivacy.addFriend", "Add friend")}
          </Button>
        )}
        {requestPending && (
          <div className="flex items-center justify-center gap-2 text-stone-500 text-sm">
            <Clock className="w-4 h-4" />
            {t("communityPrivacy.requestPending", "Friend request pending")}
          </div>
        )}
        {!canRequest && !requestPending && (
          <p className="text-stone-500 text-sm">
            {t(
              "communityPrivacy.requestsDisabled",
              "This collector is not accepting friend requests right now."
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}