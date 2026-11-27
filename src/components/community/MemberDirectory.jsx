import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, UserPlus, Users } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { SafeText } from "@/components/ui/SafeText";

const INITIAL_COUNT = 6;

export default function MemberDirectory({ profiles = [], currentUser, friendships = [], onAddFriend, isAdding }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const members = profiles
    .filter((profile) => profile.user_email && profile.user_email !== currentUser?.email)
    .sort((a, b) =>
      (a.display_name || a.user_email || '').localeCompare(b.display_name || b.user_email || '')
    );

  if (members.length === 0) return null;

  const visible = showAll ? members : members.slice(0, INITIAL_COUNT);

  const friendState = (email) => {
    const link = friendships.find(
      (friendship) =>
        (friendship.requester_email === email || friendship.recipient_email === email) &&
        friendship.status !== 'declined'
    );
    if (!link) return null;
    return link.status;
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(145deg, rgba(52, 37, 24, 0.72), rgba(42, 30, 20, 0.88))",
        border: "1px solid rgba(120, 90, 65, 0.3)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.1)"
      }}
    >
      <div
        className="px-5 py-4 border-b flex items-center gap-2"
        style={{ borderBottomColor: "rgba(120, 90, 65, 0.25)" }}
      >
        <Users className="w-4 h-4" style={{ color: '#D4A574' }} />
        <h2 className="text-base font-semibold" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
          {t('communityFeed.collectors', 'Collectors')}
        </h2>
        <Badge variant="outline" className="ml-auto text-[10px] text-[#E0D8C8]/70 border-[rgba(180,140,75,0.35)]">
          {members.length}
        </Badge>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((profile) => {
          const state = friendState(profile.user_email);
          const location = profile.show_location
            ? [profile.city, profile.state_province, profile.country].filter(Boolean).join(', ')
            : '';

          return (
            <div
              key={profile.id}
              className="p-3 rounded-md flex flex-col gap-2"
              style={{ background: 'rgba(35, 24, 16, 0.65)', border: '1px solid rgba(120, 90, 65, 0.24)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-[#A35C5C] text-[#E0D8C8] text-sm">
                    {profile.display_name?.[0]?.toUpperCase() || profile.user_email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SafeText as="p" className="text-sm font-semibold text-[#E0D8C8]" truncate>
                    {profile.display_name || profile.user_email}
                  </SafeText>
                  {location && (
                    <p className="text-[11px] text-[#E0D8C8]/55 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{location}</span>
                    </p>
                  )}
                </div>
              </div>

              {profile.bio && (
                <SafeText as="p" className="text-xs text-[#E0D8C8]/65" lines={2}>
                  {profile.bio}
                </SafeText>
              )}

              <div className="flex items-center gap-2 mt-auto pt-1">
                <a
                  href={createPageUrl(`PublicProfile?email=${encodeURIComponent(profile.user_email)}`)}
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    {t('communityFeed.viewProfile', 'View profile')}
                  </Button>
                </a>

                {state === 'accepted' ? (
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                    {t('communityExtended.friends', 'Friends')}
                  </Badge>
                ) : state === 'pending' ? (
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40">
                    {t('communityFeed.requestPending', 'Pending')}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="text-xs"
                    disabled={isAdding}
                    onClick={() => onAddFriend?.(profile.user_email)}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    {t('communityFeed.addFriend', 'Add')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {members.length > INITIAL_COUNT && (
        <div className="px-5 pb-4">
          <Button variant="ghost" size="sm" onClick={() => setShowAll((value) => !value)}>
            {showAll
              ? t('communityFeed.showFewer', 'Show fewer')
              : t('communityFeed.showAllMembers', { defaultValue: 'Show all {{count}}', count: members.length })}
          </Button>
        </div>
      )}
    </div>
  );
}