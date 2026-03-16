import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAppleBuild } from "@/components/utils/appVariant";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Users, UserPlus, Mail, UserCheck, UserX, Eye, Settings, UserCog, CheckCircle, XCircle, Clock, MapPin, MessageSquare, User, Send } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import MessagingPanel from "@/components/community/MessagingPanel";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { SafeText, SafeLabel } from "@/components/ui/SafeText";

function CommunityPageInner() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('discover');
  const [profile, setProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [locationFilters, setLocationFilters] = useState({
    country: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [activeLocationFilters, setActiveLocationFilters] = useState({
    country: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [showResults, setShowResults] = useState(false);
  const queryClient = useQueryClient();

  const { user, isLoading: userLoading, hasPaid } = useCurrentUser();

  const { data: userProfile, isLoading: profileLoading, isFetching: profileFetching } = useQuery({
    queryKey: ['user-profile', user?.id, user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      const foundProfile = profiles[0] || null;
      setProfile(foundProfile);
      return foundProfile;
    },
    enabled: !!user?.email,
    // Short staleTime so messaging toggle changes appear promptly after visiting Profile
    staleTime: 5_000,
    gcTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile]);

  const blocked = Array.isArray(userProfile?.blocked_users) ? userProfile.blocked_users : [];

  const { data: connections = [] } = useQuery({
    queryKey: ['connections', user?.email],
    queryFn: () => base44.entities.UserConnection.filter({ follower_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: friendships = [], isLoading: friendshipsLoading } = useQuery({
    queryKey: ['friendships', user?.email],
    queryFn: async () => {
      const sent = await base44.entities.Friendship.filter({ requester_email: user?.email });
      const received = await base44.entities.Friendship.filter({ recipient_email: user?.email });
      return [...sent, ...received];
    },
    enabled: !!user?.email,
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ['friend-requests', user?.email],
    queryFn: () => base44.entities.Friendship.filter({ recipient_email: user?.email, status: 'pending' }),
    enabled: !!user?.email,
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['community-unread-messages', user?.email, activeTab],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Message.filter({
        recipient_email: user.email,
        is_read: false,
      });
    },
    enabled: !!user?.email,
    refetchInterval: activeTab === 'inbox' ? 5000 : 30000,
    retry: false,
  });

  const { data: allPublicProfiles = [] } = useQuery({
    queryKey: ['all-public-profiles'],
    queryFn: () => base44.entities.UserProfile.filter({ is_public: true }, '-updated_date', 200),
    // TODO: Paginate this query as community grows. Currently capped at 200 most-recently-updated public profiles.
  });

  const publicProfiles = useMemo(() => {
    let filtered = [...allPublicProfiles].filter(p => !blocked.includes(p.user_email));
    
    if (activeSearchQuery.trim()) {
      filtered = filtered.filter(p => 
        p.display_name?.toLowerCase().includes(activeSearchQuery.toLowerCase()) ||
        p.user_email?.toLowerCase().includes(activeSearchQuery.toLowerCase())
      );
    }
    
    if (activeLocationFilters.country || activeLocationFilters.city || activeLocationFilters.state || activeLocationFilters.zipCode) {
      filtered = filtered.filter(p => {
        if (!p.show_location) return false;
        
        let matches = true;
        
        if (activeLocationFilters.country) {
          matches = matches && p.country?.toLowerCase().includes(activeLocationFilters.country.toLowerCase());
        }
        if (activeLocationFilters.city) {
          matches = matches && p.city?.toLowerCase().includes(activeLocationFilters.city.toLowerCase());
        }
        if (activeLocationFilters.state) {
          matches = matches && p.state_province?.toLowerCase().includes(activeLocationFilters.state.toLowerCase());
        }
        if (activeLocationFilters.zipCode) {
          matches = matches && p.postal_code?.toLowerCase().includes(activeLocationFilters.zipCode.toLowerCase());
        }
        
        return matches;
      });
    }
    
    return filtered;
  }, [allPublicProfiles, activeSearchQuery, activeLocationFilters, blocked]);

  const followMutation = useMutation({
    mutationFn: (email) => base44.entities.UserConnection.create({
      follower_email: user?.email,
      following_email: email,
      status: 'active'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', user?.email] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (connectionId) => base44.entities.UserConnection.delete(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', user?.email] });
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: (email) => base44.entities.Friendship.create({
      requester_email: user?.email,
      recipient_email: email,
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships', user?.email] });
    },
  });

  const acceptFriendRequestMutation = useMutation({
    mutationFn: (friendshipId) =>
      base44.entities.Friendship.update(friendshipId, { status: 'accepted' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests', user?.email] });
    },
  });

  const declineFriendRequestMutation = useMutation({
    mutationFn: (friendshipId) =>
      base44.entities.Friendship.update(friendshipId, { status: 'declined' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests', user?.email] });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendshipId) => base44.entities.Friendship.delete(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships', user?.email] });
    },
  });

  const isFollowing = (email) => {
    return connections.some(c => c.following_email === email);
  };

  const getConnection = (email) => {
    return connections.find(c => c.following_email === email);
  };

  const getFriendship = (email) => {
    return friendships.find(f => 
      (f.requester_email === email || f.recipient_email === email) && 
      (f.requester_email === user?.email || f.recipient_email === user?.email)
    );
  };

  const isFriend = (email) => {
    const friendship = getFriendship(email);
    return friendship?.status === 'accepted';
  };

  const hasPendingRequest = (email) => {
    const friendship = getFriendship(email);
    return friendship?.status === 'pending';
  };

  const acceptedFriends = friendships.filter(f => f.status === 'accepted');
  const unreadInboxCount = unreadMessages.length;

  if (!hasPaid) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <UpgradePrompt
            featureName={t("communityExtended.communityFeatures")}
            description={t("communityExtended.upgradePromptDesc")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 
            className="text-3xl font-bold mb-2" 
            style={{ 
              color: "#F5F1E7",
              fontFamily: "'Georgia', serif",
              textShadow: "0 2px 4px rgba(0,0,0,0.6)"
            }}
          >
            {t("nav.community")}
          </h1>
          <p className="text-base" style={{ color: "rgba(224, 216, 200, 0.75)" }}>
            {t("communityExtended.connectEnthusiasts")}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList 
              className="inline-flex min-w-full sm:w-auto"
              style={{
                background: "linear-gradient(145deg, rgba(52, 37, 24, 0.75), rgba(42, 30, 20, 0.88))",
                border: "1px solid rgba(120, 90, 65, 0.32)",
                boxShadow: "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.1)"
              }}
            >
              <TabsTrigger value="discover" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4">
                <Search className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">{t("communityExtended.discover")}</span>
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4">
                <UserCog className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">{t("communityExtended.friends")}</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 relative">
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">{t("communityExtended.requests")}</span>
                {friendRequests.length > 0 && (
                  <Badge className="absolute -top-1 -right-0 sm:relative sm:top-0 sm:right-0 sm:ml-1 bg-amber-600 text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0 min-w-[14px] sm:min-w-[16px]">
                    {friendRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="inbox" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 relative">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">{t("communityExtended.inbox")}</span>
                {unreadInboxCount > 0 && (
                  <Badge className="absolute -top-1 -right-0 sm:relative sm:top-0 sm:right-0 sm:ml-1 bg-rose-600 text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0 min-w-[14px] sm:min-w-[16px]">
                    {unreadInboxCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="following" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">{t("nav.following")}</span>
              </TabsTrigger>
              <TabsTrigger value="myprofile" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4">
                <User className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">{t("nav.profile")}</span>
              </TabsTrigger>
              <TabsTrigger value="invite" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4">
                <Send className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">{t("communityExtended.invite")}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="discover" className="space-y-6">
            {!profileLoading && !profileFetching && !userProfile?.is_public && (
              <div 
                className="rounded-lg p-5"
                style={{
                  background: "linear-gradient(145deg, rgba(180, 140, 75, 0.12), rgba(160, 120, 65, 0.18))",
                  border: "1px solid rgba(180, 140, 75, 0.3)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                }}
              >
                <div>
                  <p className="text-sm mb-3" style={{ color: "rgba(224, 216, 200, 0.9)" }}>
                    <strong>{t("communityExtended.profilePrivate")}</strong> {t("communityExtended.profilePrivateDesc")}
                  </p>
                  <a href={createPageUrl('Profile')}>
                    <Button 
                      size="sm" 
                      variant="outline"
                      style={{
                        background: "rgba(60, 42, 28, 0.4)",
                        borderColor: "rgba(180, 140, 75, 0.4)",
                        color: "#F5F1E7"
                      }}
                    >
                      {t("communityExtended.updateSettings")}
                    </Button>
                  </a>
                </div>
              </div>
            )}

            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(52, 37, 24, 0.78), rgba(42, 30, 20, 0.90))",
                border: "1px solid rgba(120, 90, 65, 0.32)",
                boxShadow: "0 3px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12), inset 0 -2px 3px rgba(0,0,0,0.25)",
              }}
            >
              <div 
                className="px-6 py-5 border-b"
                style={{
                  borderBottomColor: "rgba(120, 90, 65, 0.25)",
                  background: "linear-gradient(to bottom, rgba(60, 42, 28, 0.35), transparent)"
                }}
              >
                <h2 className="text-lg font-semibold" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
                  {t("communityExtended.findUsers")}
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4 mb-6">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-[#E0D8C8]/50" />
                      <Input
                        placeholder={t("communityExtended.searchByName")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setActiveSearchQuery(searchQuery)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        setActiveSearchQuery(searchQuery);
                        setShowResults(true);
                      }}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      {t("common.search")}
                    </Button>
                  </div>

                  <div 
                   className="space-y-3 p-5 rounded-lg"
                   style={{
                     background: "rgba(35, 24, 16, 0.6)",
                     border: "1px solid rgba(120, 90, 65, 0.25)",
                     boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)"
                   }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-3.5 h-3.5" style={{ color: "rgba(180, 140, 75, 0.8)" }} />
                      <h4 className="font-semibold text-sm" style={{ color: "#F5F1E7" }}>
                        {t("communityExtended.searchByLocation")}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select
                        value={locationFilters.country || "__ALL__"}
                        onValueChange={(value) => setLocationFilters({
                          ...locationFilters, 
                          country: value === "__ALL__" ? "" : value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("communityExtended.selectCountry")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__ALL__">{t("communityExtended.allCountries")}</SelectItem>
                          <SelectItem value="United States">{t("countries.unitedStates")}</SelectItem>
                          <SelectItem value="Canada">{t("countries.canada")}</SelectItem>
                          <SelectItem value="United Kingdom">{t("countries.unitedKingdom")}</SelectItem>
                          <SelectItem value="Ireland">{t("countries.ireland")}</SelectItem>
                          <SelectItem value="Australia">{t("countries.australia")}</SelectItem>
                          <SelectItem value="New Zealand">{t("countries.newZealand")}</SelectItem>
                          <SelectItem value="Germany">{t("countries.germany")}</SelectItem>
                          <SelectItem value="France">{t("countries.france")}</SelectItem>
                          <SelectItem value="Italy">{t("countries.italy")}</SelectItem>
                          <SelectItem value="Spain">{t("countries.spain")}</SelectItem>
                          <SelectItem value="Netherlands">{t("countries.netherlands")}</SelectItem>
                          <SelectItem value="Belgium">{t("countries.belgium")}</SelectItem>
                          <SelectItem value="Switzerland">{t("countries.switzerland")}</SelectItem>
                          <SelectItem value="Austria">{t("countries.austria")}</SelectItem>
                          <SelectItem value="Denmark">{t("countries.denmark")}</SelectItem>
                          <SelectItem value="Sweden">{t("countries.sweden")}</SelectItem>
                          <SelectItem value="Norway">{t("countries.norway")}</SelectItem>
                          <SelectItem value="Finland">{t("countries.finland")}</SelectItem>
                          <SelectItem value="Japan">{t("countries.japan")}</SelectItem>
                          <SelectItem value="South Korea">{t("countries.southKorea")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder={t("communityExtended.cityPlaceholder")}
                        value={locationFilters.city}
                        onChange={(e) => setLocationFilters({...locationFilters, city: e.target.value})}
                      />
                      <Input
                        placeholder={t("communityExtended.statePlaceholder")}
                        value={locationFilters.state}
                        onChange={(e) => setLocationFilters({...locationFilters, state: e.target.value})}
                      />
                      <Input
                        placeholder={t("communityExtended.zipPlaceholder")}
                        value={locationFilters.zipCode}
                        onChange={(e) => setLocationFilters({...locationFilters, zipCode: e.target.value})}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setActiveLocationFilters(locationFilters);
                          setShowResults(true);
                        }}
                        className="flex-1"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        {t("communityExtended.searchLocation")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setLocationFilters({ country: '', city: '', state: '', zipCode: '' });
                          setActiveLocationFilters({ country: '', city: '', state: '', zipCode: '' });
                        }}
                      >
                        {t("communityExtended.clear")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Results Sheet */}
            <Sheet open={showResults} onOpenChange={setShowResults}>
              <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("communityExtended.searchResults")}</SheetTitle>
                  <SheetDescription>
                    {publicProfiles.filter(p => p.user_email !== user?.email).length} {t("communityExtended.usersFound")}
                  </SheetDescription>
                  <div className="flex gap-2 mt-4">
                    <a href={createPageUrl('Home')} className="flex-1">
                      <Button variant="outline" className="w-full">
                        {t("nav.home")}
                      </Button>
                    </a>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowResults(false)}
                    >
                      {t("communityExtended.returnToSearch")}
                    </Button>
                  </div>
                </SheetHeader>
                <div className="space-y-2 mt-6">
                  {publicProfiles.filter(p => p.user_email !== user?.email).map((profile) => (
                    <div 
                     key={profile.id} 
                     className="p-5 rounded-lg transition-all duration-200 hover:-translate-y-0.5"
                     style={{
                       background: "linear-gradient(145deg, rgba(48, 34, 22, 0.65), rgba(38, 26, 18, 0.78))",
                       border: "1px solid rgba(120, 90, 65, 0.28)",
                       boxShadow: "0 2px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180,140,100,0.08)"
                     }}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback className="bg-[#A35C5C] text-[#E0D8C8]">
                            {profile.display_name?.[0] || profile.user_email?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                           <a href={createPageUrl(`PublicProfile?email=${encodeURIComponent(profile.user_email)}`)}>
                             <SafeText as="h3" className="font-semibold text-[#E0D8C8] hover:text-[#A35C5C]" truncate>
                               {profile.display_name || profile.user_email}
                             </SafeText>
                           </a>
                           {profile.bio && (
                             <SafeText as="p" className="text-sm text-[#E0D8C8]/70" lines={1}>{profile.bio}</SafeText>
                           )}
                          {profile.show_location && (profile.city || profile.state_province || profile.country) && (
                            <p className="text-xs text-[#E0D8C8]/60 mt-1">
                              📍 {[profile.city, profile.state_province, profile.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0 min-w-0">
                          {isFriend(profile.user_email) ? (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-300 whitespace-nowrap text-center">
                              <UserCheck className="w-3 h-3 mr-1" />
                              {t("communityExtended.friendStatus")}
                            </Badge>
                          ) : hasPendingRequest(profile.user_email) ? (
                            <Badge variant="outline" className="text-amber-700 border-amber-300 whitespace-nowrap text-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {t("communityExtended.pendingStatus")}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendFriendRequestMutation.mutate(profile.user_email)}
                              disabled={sendFriendRequestMutation.isPending}
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 whitespace-nowrap w-full"
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              {t("communityExtended.addFriend")}
                            </Button>
                          )}
                          {isFollowing(profile.user_email) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unfollowMutation.mutate(getConnection(profile.user_email)?.id)}
                              disabled={unfollowMutation.isPending}
                              className="whitespace-nowrap w-full"
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              {t("communityExtended.following")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => followMutation.mutate(profile.user_email)}
                              disabled={followMutation.isPending}
                              className="whitespace-nowrap w-full"
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              {t("communityExtended.follow")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {publicProfiles.filter(p => p.user_email !== user?.email).length === 0 && (
                    <div className="text-center py-12 text-[#E0D8C8]/70">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>{t("communityExtended.noUsersFound")}</p>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </TabsContent>

          <TabsContent value="inbox" className="space-y-6">
            {(profileLoading || profileFetching || friendshipsLoading) ? (
              <Card className="bg-[#1E2F43] border-[#E0D8C8]/15">
                <CardContent className="p-4 text-center text-[#E0D8C8]/60 text-sm">
                  {t("common.loading")}
                </CardContent>
              </Card>
            ) : !profile?.enable_messaging ? (
              <Card className="bg-[#1E2F43] border-amber-500/30">
                <CardContent className="p-4 flex items-start gap-3">
                  <Mail className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-[#E0D8C8]/80 font-medium">Messaging disabled</p>
                    <p className="text-xs text-[#E0D8C8]/60 mt-1">Enable messaging in your profile settings.</p>
                  </div>
                  <a href={createPageUrl('Profile')}>
                    <Button size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Go to settings
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ) : acceptedFriends.length === 0 ? (
              <Card className="bg-[#223447] border-[#E0D8C8]/15">
                <CardContent className="py-12 text-center text-[#E0D8C8]/70">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>{t("communityExtended.noFriendsToMessage")}</p>
                  <p className="text-sm mt-2">{t("communityExtended.noFriendsToMessageDesc")}</p>
                </CardContent>
              </Card>
            ) : (
              <MessagingPanel 
                user={user} 
                friends={acceptedFriends} 
                publicProfiles={allPublicProfiles || []}
              />
            )}
          </TabsContent>

          <TabsContent value="friends" className="space-y-6">
            {acceptedFriends.length === 0 ? (
              <div 
                className="rounded-lg"
                style={{
                  background: "linear-gradient(145deg, rgba(52, 37, 24, 0.7), rgba(42, 30, 20, 0.84))",
                  border: "1px solid rgba(120, 90, 65, 0.28)",
                  boxShadow: "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)"
                }}
              >
                <div className="py-12 text-center" style={{ color: "rgba(224, 216, 200, 0.7)" }}>
                  <UserCog className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: "rgba(180, 140, 75, 0.5)" }} />
                  <p>{t("communityExtended.noFriendsYet")}</p>
                  <p className="text-sm mt-2">{t("communityExtended.noFriendsYetDesc")}</p>
                </div>
              </div>
            ) : (
              <div
                className="rounded-lg overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, rgba(52, 37, 24, 0.78), rgba(42, 30, 20, 0.90))",
                  border: "1px solid rgba(120, 90, 65, 0.32)",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12), inset 0 -2px 3px rgba(0,0,0,0.25)"
                }}
              >
                <div 
                  className="px-6 py-5 border-b"
                  style={{
                    borderBottomColor: "rgba(120, 90, 65, 0.28)",
                    background: "linear-gradient(to bottom, rgba(62, 44, 30, 0.4), transparent)"
                  }}
                >
                  <h2 className="text-lg font-semibold" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
                    {t("communityExtended.yourFriends")}
                  </h2>
                </div>
                <div className="p-6 space-y-3">
                  {acceptedFriends.map((friendship) => {
                    const friendEmail = friendship.requester_email === user?.email 
                      ? friendship.recipient_email 
                      : friendship.requester_email;
                    const profile = publicProfiles.find(p => p.user_email === friendEmail);
                    return (
                      <div 
                        key={friendship.id}
                        className="p-5 rounded-lg"
                        style={{
                         background: "linear-gradient(145deg, rgba(45, 32, 22, 0.65), rgba(35, 24, 16, 0.78))",
                         border: "1px solid rgba(120, 90, 65, 0.25)",
                         boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,140,100,0.08)"
                        }}
                        >
                        <div>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12 flex-shrink-0">
                              <AvatarImage src={profile?.avatar_url} />
                              <AvatarFallback className="bg-[#A35C5C] text-[#E0D8C8]">
                                {profile?.display_name?.[0] || friendEmail?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <a href={createPageUrl(`PublicProfile?email=${encodeURIComponent(friendEmail)}`)}>
                                <h3 className="font-semibold text-[#E0D8C8] hover:text-[#A35C5C] truncate">
                                  {profile?.display_name || friendEmail}
                                </h3>
                              </a>
                              {profile?.bio && (
                                <p className="text-sm text-[#E0D8C8]/70 line-clamp-1">{profile.bio}</p>
                              )}
                              {profile?.show_location && (profile?.city || profile?.state_province || profile?.country) && (
                                <p className="text-xs text-[#E0D8C8]/60 mt-1 truncate">
                                  📍 {[profile.city, profile.state_province, profile.country].filter(Boolean).join(', ')}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(t("communityExtended.removeFriendConfirm"))) {
                                  removeFriendMutation.mutate(friendship.id);
                                }
                              }}
                              disabled={removeFriendMutation.isPending}
                              className="text-rose-600 hover:bg-rose-50 flex-shrink-0"
                            >
                              <UserX className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">{t("communityExtended.remove")}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            {friendRequests.length === 0 ? (
              <div 
                className="rounded-lg"
                style={{
                  background: "linear-gradient(145deg, rgba(52, 37, 24, 0.7), rgba(42, 30, 20, 0.84))",
                  border: "1px solid rgba(120, 90, 65, 0.28)",
                  boxShadow: "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)"
                }}
              >
                <div className="py-12 text-center" style={{ color: "rgba(224, 216, 200, 0.7)" }}>
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: "rgba(180, 140, 75, 0.5)" }} />
                  <p>{t("communityExtended.noPendingRequests")}</p>
                  <p className="text-sm mt-2">{t("communityExtended.noPendingRequestsDesc")}</p>
                </div>
              </div>
            ) : (
              <div
                className="rounded-lg overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, rgba(52, 37, 24, 0.78), rgba(42, 30, 20, 0.90))",
                  border: "1px solid rgba(120, 90, 65, 0.32)",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12), inset 0 -2px 3px rgba(0,0,0,0.25)"
                }}
              >
                <div 
                  className="px-6 py-5 border-b"
                  style={{
                    borderBottomColor: "rgba(120, 90, 65, 0.28)",
                    background: "linear-gradient(to bottom, rgba(62, 44, 30, 0.4), transparent)"
                  }}
                >
                  <h2 className="text-lg font-semibold" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
                    {t("communityExtended.pendingFriendRequests")}
                  </h2>
                </div>
                <div className="p-6 space-y-3">
                  {friendRequests.map((request) => {
                    const profile = publicProfiles.find(p => p.user_email === request.requester_email);
                    return (
                      <div 
                        key={request.id}
                        className="p-5 rounded-lg"
                        style={{
                         background: "linear-gradient(145deg, rgba(45, 32, 22, 0.65), rgba(35, 24, 16, 0.78))",
                         border: "1px solid rgba(120, 90, 65, 0.25)",
                         boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,140,100,0.08)"
                        }}
                        >
                        <div>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12 flex-shrink-0">
                              <AvatarImage src={profile?.avatar_url} />
                              <AvatarFallback className="bg-[#A35C5C] text-[#E0D8C8]">
                                {profile?.display_name?.[0] || request.requester_email?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <a href={createPageUrl(`PublicProfile?email=${encodeURIComponent(request.requester_email)}`)}>
                                <h3 className="font-semibold text-[#E0D8C8] hover:text-[#A35C5C] truncate">
                                  {profile?.display_name || request.requester_email}
                                </h3>
                              </a>
                              <p className="text-xs text-[#E0D8C8]/60">{t("communityExtended.wantsToBeFriends")}</p>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0 min-w-0">
                              <Button
                                size="sm"
                                onClick={() => acceptFriendRequestMutation.mutate(request.id)}
                                disabled={acceptFriendRequestMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap"
                              >
                                <CheckCircle className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline">{t("communityExtended.acceptRequest")}</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => declineFriendRequestMutation.mutate(request.id)}
                                disabled={declineFriendRequestMutation.isPending}
                                className="text-rose-600 hover:bg-rose-50 whitespace-nowrap"
                              >
                                <XCircle className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline">{t("communityExtended.declineRequest")}</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-4">
            {connections.length === 0 ? (
              <div 
                className="rounded-lg"
                style={{
                  background: "linear-gradient(145deg, rgba(52, 37, 24, 0.7), rgba(42, 30, 20, 0.84))",
                  border: "1px solid rgba(120, 90, 65, 0.28)",
                  boxShadow: "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)"
                }}
              >
                <div className="py-12 text-center" style={{ color: "rgba(224, 216, 200, 0.7)" }}>
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: "rgba(180, 140, 75, 0.5)" }} />
                  <p>{t("community.notFollowingYet")}</p>
                  <p className="text-sm mt-2">{t("community.notFollowingYetDesc")}</p>
                  <a href={createPageUrl('Community')}>
                    <Button className="mt-4" onClick={() => setActiveTab('discover')}>
                      <Search className="w-4 h-4 mr-2" />
                      {t("community.exploreCommunity")}
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              connections.map((connection) => {
                const profile = publicProfiles.find(p => p.user_email === connection.following_email);
                return (
                  <div 
                    key={connection.id}
                    className="p-5 rounded-lg"
                    style={{
                      background: "linear-gradient(145deg, rgba(48, 34, 22, 0.68), rgba(38, 26, 18, 0.82))",
                      border: "1px solid rgba(120, 90, 65, 0.28)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180,140,100,0.08)"
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback className="bg-[#A35C5C] text-[#E0D8C8]">
                            {profile?.display_name?.[0] || connection.following_email?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <a href={createPageUrl(`PublicProfile?email=${encodeURIComponent(connection.following_email)}`)}>
                            <h3 className="font-semibold text-[#E0D8C8] hover:text-[#A35C5C] truncate">
                              {profile?.display_name || connection.following_email}
                            </h3>
                          </a>
                          {profile?.bio && (
                            <p className="text-sm text-[#E0D8C8]/70 line-clamp-1">{profile.bio}</p>
                          )}
                          {profile?.show_location && (profile?.city || profile?.state_province || profile?.country) && (
                            <p className="text-xs text-[#E0D8C8]/60 mt-1 truncate">
                              📍 {[profile.city, profile.state_province, profile.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unfollowMutation.mutate(connection.id)}
                          disabled={unfollowMutation.isPending}
                          className="flex-shrink-0"
                        >
                          <UserX className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">{t("communityExtended.remove")}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="myprofile">
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(52, 37, 24, 0.78), rgba(42, 30, 20, 0.90))",
                border: "1px solid rgba(120, 90, 65, 0.32)",
                boxShadow: "0 3px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12), inset 0 -2px 3px rgba(0,0,0,0.25)"
              }}
            >
              <div 
                className="px-6 py-5 border-b"
                style={{
                  borderBottomColor: "rgba(120, 90, 65, 0.25)",
                  background: "linear-gradient(to bottom, rgba(60, 42, 28, 0.35), transparent)"
                }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
                    {t("communityExtended.yourPublicProfile")}
                  </h2>
                {user?.email && (
                  <a href={createPageUrl(`PublicProfile?email=${encodeURIComponent(user.email)}${userProfile?.is_public ? '' : '&preview=true'}`)}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      {userProfile?.is_public ? t("communityExtended.viewProfile") : t("communityExtended.previewProfile")}
                    </Button>
                  </a>
                )}
                </div>
              </div>
              <div className="p-6 space-y-4">
                {userProfile?.is_public ? (
                  <>
                    <div 
                      className="p-4 rounded-lg"
                      style={{
                        background: "rgba(46, 175, 111, 0.15)",
                        border: "1px solid rgba(46, 175, 111, 0.3)"
                      }}
                    >
                      <p className="text-sm" style={{ color: "rgba(46, 175, 111, 1)" }}>
                        ✅ {t("communityExtended.profilePublic")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold" style={{ color: "#F5F1E7" }}>
                        {t("communityExtended.profileSettings")}
                      </h4>
                      <p className="text-sm" style={{ color: "rgba(224, 216, 200, 0.8)" }}>
                        {t("communityExtended.displayName")}: <strong>{userProfile.display_name || t("communityExtended.notSet")}</strong>
                      </p>
                      {userProfile.bio && (
                        <p className="text-sm break-words" style={{ color: "rgba(224, 216, 200, 0.8)" }}>
                          {t("communityExtended.bio")}: {userProfile.bio}
                        </p>
                      )}
                      <p className="text-sm" style={{ color: "rgba(224, 216, 200, 0.8)" }}>
                        {t("communityExtended.commentsLabel")}: <strong>{userProfile.allow_comments ? t("community.commentsEnabled") : t("community.commentsDisabled")}</strong>
                      </p>
                    </div>
                    <a href={createPageUrl('Profile')}>
                      <Button variant="outline" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        {t("communityExtended.editProfileSettings")}
                      </Button>
                    </a>
                  </>
                ) : (
                  <>
                    <div 
                      className="p-4 rounded-lg"
                      style={{
                        background: "rgba(30, 20, 15, 0.6)",
                        border: "1px solid rgba(120, 90, 65, 0.2)"
                      }}
                    >
                      <p className="text-sm mb-2" style={{ color: "rgba(224, 216, 200, 0.8)" }}>
                        {t("communityExtended.profileCurrentlyPrivate")}
                      </p>
                    </div>
                    <a href={createPageUrl('Profile')}>
                      <Button className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        {t("communityExtended.makeProfilePublic")}
                      </Button>
                    </a>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invite">
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(52, 37, 24, 0.78), rgba(42, 30, 20, 0.90))",
                border: "1px solid rgba(120, 90, 65, 0.32)",
                boxShadow: "0 3px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12), inset 0 -2px 3px rgba(0,0,0,0.25)"
              }}
            >
              <div 
                className="px-6 py-5 border-b"
                style={{
                  borderBottomColor: "rgba(120, 90, 65, 0.25)",
                  background: "linear-gradient(to bottom, rgba(60, 42, 28, 0.35), transparent)"
                }}
              >
                <h2 className="text-lg font-semibold" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
                  {t("communityExtended.inviteFriends")}
                </h2>
              </div>
              <div className="p-6">
                <p className="mb-4" style={{ color: "rgba(224, 216, 200, 0.8)" }}>
                  {t("communityExtended.inviteFriendsDesc")}
                </p>
                <a href={createPageUrl('Invite')}>
                  <Button>
                    <Mail className="w-4 h-4 mr-2" />
                    {t("communityExtended.sendInvitations")}
                  </Button>
                </a>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  if (isAppleBuild) return null;
  return <CommunityPageInner />;
}