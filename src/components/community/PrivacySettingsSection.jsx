import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Globe, Lock, UserPlus, MessageCircle, Share2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { COLLECTION_MODULES } from "@/components/utils/communityPrivacy";

const textSoft = { color: "rgba(224,216,200,0.72)" };
const textMuted = { color: "rgba(224,216,200,0.5)" };

function ChoiceRow({ options, value, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => onSelect(option.value)}
            className={
              active
                ? "bg-[#A35C5C] hover:bg-[#8C4A4A] text-[#F5F1E7] border-transparent"
                : "border-[rgba(140,105,65,0.3)] hover:bg-[rgba(180,140,75,0.1)]"
            }
            style={active ? undefined : { color: "rgba(224,216,200,0.7)" }}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Community privacy controls shown inside the Profile page's Privacy section.
 * Purely controlled — the Profile page owns the form state and the save.
 */
export default function PrivacySettingsSection({ value, onChange }) {
  const { t } = useTranslation();
  const visibility = value?.visibility || "private";
  const messaging = value?.messaging || "disabled";
  const friendRequests = value?.friendRequests !== false;
  const sharedModules = Array.isArray(value?.sharedModules) ? value.sharedModules : [];

  const toggleModule = (key) => {
    const next = sharedModules.includes(key)
      ? sharedModules.filter((k) => k !== key)
      : [...sharedModules, key];
    onChange({ sharedModules: next });
  };

  return (
    <div className="space-y-5">
      {/* Profile visibility */}
      <div>
        <div className="flex items-center gap-2">
          {visibility === "public" ? (
            <Globe className="w-4 h-4" style={textSoft} />
          ) : (
            <Lock className="w-4 h-4" style={textSoft} />
          )}
          <span className="text-sm font-medium" style={{ color: "rgba(224,216,200,0.85)" }}>
            {t("communityPrivacy.profileVisibility", "Who can see my profile")}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={textMuted}>
          {t(
            "communityPrivacy.profileVisibilityDesc",
            "Private profiles are visible to accepted friends only. Everyone can still use the community."
          )}
        </p>
        <ChoiceRow
          value={visibility}
          onSelect={(next) => onChange({ visibility: next })}
          options={[
            { value: "public", label: t("communityPrivacy.visibilityPublic", "Any collector") },
            { value: "private", label: t("communityPrivacy.visibilityPrivate", "Friends only") },
          ]}
        />
      </div>

      {/* Messaging */}
      <div className="pt-4 border-t" style={{ borderColor: "rgba(224,216,200,0.1)" }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" style={textSoft} />
          <span className="text-sm font-medium" style={{ color: "rgba(224,216,200,0.85)" }}>
            {t("communityPrivacy.messagingTitle", "Who can message me")}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={textMuted}>
          {t(
            "communityPrivacy.messagingDesc",
            "Turning messaging off keeps your existing conversations, but nobody can start a new one."
          )}
        </p>
        <ChoiceRow
          value={messaging}
          onSelect={(next) => onChange({ messaging: next })}
          options={[
            { value: "everyone", label: t("communityPrivacy.messagingEveryone", "Everyone") },
            { value: "friends", label: t("communityPrivacy.messagingFriends", "Friends only") },
            { value: "disabled", label: t("communityPrivacy.messagingDisabled", "Disabled") },
          ]}
        />
      </div>

      {/* Friend requests */}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "rgba(224,216,200,0.1)" }}>
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" style={textSoft} />
            <span className="text-sm font-medium" style={{ color: "rgba(224,216,200,0.85)" }}>
              {t("communityPrivacy.friendRequests", "Allow friend requests")}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={textMuted}>
            {t(
              "communityPrivacy.friendRequestsDesc",
              "Collectors can ask to connect with you even when messaging is off."
            )}
          </p>
        </div>
        <Switch
          checked={friendRequests}
          onCheckedChange={(v) => onChange({ friendRequests: !!v })}
          className="data-[state=checked]:bg-[#A35C5C]"
        />
      </div>

      {/* Per-module collection sharing */}
      <div className="pt-4 border-t" style={{ borderColor: "rgba(224,216,200,0.1)" }}>
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4" style={textSoft} />
          <span className="text-sm font-medium" style={{ color: "rgba(224,216,200,0.85)" }}>
            {t("communityPrivacy.sharedCollections", "Collections shown on my profile")}
          </span>
        </div>
        <p className="text-xs mt-0.5 mb-3" style={textMuted}>
          {t(
            "communityPrivacy.sharedCollectionsDesc",
            "Choose each collection you are willing to show to the people who can view your profile."
          )}
        </p>
        <div className="space-y-3">
          {COLLECTION_MODULES.map((module) => {
            const shared = sharedModules.includes(module.key);
            return (
              <div key={module.key} className="flex items-center justify-between">
                <span className="text-sm" style={textSoft}>
                  {t(module.labelKey, module.fallback)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={shared ? { color: "rgba(163,92,92,0.9)" } : textMuted}>
                    {shared
                      ? t("communityPrivacy.shared", "Shared")
                      : t("communityPrivacy.hidden", "Hidden")}
                  </span>
                  <Switch
                    checked={shared}
                    onCheckedChange={() => toggleModule(module.key)}
                    className="data-[state=checked]:bg-[#A35C5C]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}