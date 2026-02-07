import React, { useState } from 'react';
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
import { hasPremiumAccess } from "@/components/utils/premiumAccess";
import { useTranslation } from "react-i18next";
import { SafeText, SafeLabel } from "@/components/ui/SafeText";

export default function CommunityPage() {
  if (isAppleBuild) return null;

  const { t } = useTranslation();
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

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 10000,
    retry: 2,
    refetchOnMount: 'always',
  });

  const hasPaidAccess = hasPremiumAccess(user);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  const blocked = Array.isArray(userProfile?.blocked_users) ? userProfile.blocked_users : [];

  const { data: connections = [] } = useQuery({
    queryKey: ['connections', user?.email],
    queryFn: () => base44.entities.UserConnection.filter({ follower_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: friendships = [] } = useQuery({
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

  // Fetch all public profiles first
  const { data: allPublicProfiles = [] } = useQuery({
    queryKey: ['all-public-profiles'],
    queryFn: () => base44.entities.UserProfile.filter({ is_public: true }),
  });

  // Apply filters to profiles
  const publicProfiles = React.useMemo(() => {
    let filtered = [...allPublicProfiles].filter(p => !blocked.includes(p.user_email));
    
    // Apply name/email search filter
    if (activeSearchQuery.trim()) {
      filtered = filtered.filter(p => 
        p.display_name?.toLowerCase().includes(activeSearchQuery.toLowerCase()) ||
        p.user_email?.toLowerCase().includes(activeSearchQuery.toLowerCase())
      );
    }
    
    // Apply location filters
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
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (connectionId) => base44.entities.UserConnection.delete(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: (email) => base44.entities.Friendship.create({
      requester_email: user?.email,
      recipient_email: email,
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });

  const acceptFriendRequestMutation = useMutation({
    mutationFn: (friendshipId) => safeUpdate('Friendship', friendshipId, { status: 'accepted' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  const declineFriendRequestMutation = useMutation({
    mutationFn: (friendshipId) => safeUpdate('Friendship', friendshipId, { status: 'declined' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendshipId) => base44.entities.Friendship.delete(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
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

  if (!hasPaidAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
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
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#e8d5b7] mb-2">{t("nav.community")}</h1>
          <p className="text-[#e8d5b7]/70">{t("communityExtended.connectEnthusiasts")}</p>
        </div>

        <Tabs defaultValue="discover" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-[#223447]/60 border border-[#E0D8C8]/15 inline-flex min-w-full sm:w-auto">
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
              <TabsTrigger value="inbox" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">{t("communityExtended.inbox")}</span>
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
            {!userProfile?.is_public && (
              <Card className="bg-[#1E2F43] border-[#E0D8C8]/15">
                <CardContent className="p-4">
                  <p className="text-sm text-[#E0D8C8]/70 mb-2">
                    <strong>{t("communityExtended.profilePrivate")}</strong> {t("communityExtended.profilePrivateDesc")}
                  </p>
                  <a href={createPageUrl('Profile')}>
                    <Button size="sm" variant="outline">
                      {t("communityExtended.updateSettings")}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#223447] border-[#E0D8C8]/15">
              <CardHeader>
                <CardTitle className="text-[#E0D8C8]">{t("communityExtended.findUsers")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-[#E0D8C8]/50" />
                      <Input
                        placeholder={t("communityExtended.searchByName")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && setActiveSearchQuery(searchQuery)}
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

                  <div className="space-y-3 p-4 bg-[#1E2F43] rounded-lg border border-[#E0D8C8]/15">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-[#E0D8C8]/70" />
                      <h4 className="font-semibold text-[#E0D8C8] text-sm">{t("communityExtended.searchByLocation")}</h4>
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
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="Ireland">Ireland</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                          <SelectItem value="New Zealand">New Zealand</SelectItem>
                          <SelectItem value="Germany">Germany</SelectItem>
                          <SelectItem value="France">France</SelectItem>
                          <SelectItem value="Italy">Italy</SelectItem>
                          <SelectItem value="Spain">Spain</SelectItem>
                          <SelectItem value="Netherlands">Netherlands</SelectItem>
                          <SelectItem value="Belgium">Belgium</SelectItem>
                          <SelectItem value="Switzerland">Switzerland</SelectItem>
                          <SelectItem value="Austria">Austria</SelectItem>
                          <SelectItem value="Denmark">Denmark</SelectItem>
                          <SelectItem value="Sweden">Sweden</SelectItem>
                          <SelectItem value="Norway">Norway</SelectItem>
                          <SelectItem value="Finland">Finland</SelectItem>
                          <SelectItem value="Japan">Japan</SelectItem>
                          <SelectItem value="South Korea">South Korea</SelectItem>
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
              </CardContent>
            </Card>

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
                    <div key={profile.id} className="p-4 bg-[#223447] border border-[#E0D8C8]/15 rounded-lg hover:border-[#A35C5C]/50 transition-colors">
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
            {userProfile?.enable_messaging ? (
              acceptedFriends.length > 0 && user ? (
                <MessagingPanel 
                  user={user} 
                  friends={acceptedFriends} 
                  publicProfiles={allPublicProfiles || []}
                />
              ) : (
                <Card className="bg-[#223447] border-[#E0D8C8]/15">
                  <CardContent className="py-12 text-center text-[#E0D8C8]/70">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>{t("communityExtended.noFriendsToMessage")}</p>
                    <p className="text-sm mt-2">{t("communityExtended.noFriendsToMessageDesc")}</p>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="bg-[#1E2F43] border-[#E0D8C8]/15">
                <CardContent className="p-6 text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-[#E0D8C8]/70" />
                  <h3 className="font-semibold text-[#E0D8C8] mb-2">{t("messaging.messagingDisabled", {defaultValue: "Messaging Disabled"})}</h3>
                  <p className="text-sm text-[#E0D8C8]/70 mb-4">
                    {t("messaging.messagingDisabledDesc", {defaultValue: "Enable messaging in your profile settings to chat with friends"})}
                  </p>
                  <a href={createPageUrl('Profile')}>
                    <Button>
                      <Settings className="w-4 h-4 mr-2" />
                      {t("messaging.goToSettings", {defaultValue: "Go to Profile Settings"})}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="friends" className="space-y-6">
            {/* Friends List */}
            {acceptedFriends.length === 0 ? (
              <Card className="bg-[#223447] border-[#E0D8C8]/15">
                <CardContent className="py-12 text-center text-[#E0D8C8]/70">
                  <UserCog className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>{t("communityExtended.noFriendsYet")}</p>
                  <p className="text-sm mt-2">{t("communityExtended.noFriendsYetDesc")}</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#223447] border-[#E0D8C8]/15">
                <CardHeader>
                  <CardTitle className="text-[#E0D8C8]">{t("communityExtended.yourFriends")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {acceptedFriends.map((friendship) => {
                    const friendEmail = friendship.requester_email === user?.email 
                      ? friendship.recipient_email 
                      : friendship.requester_email;
                    const profile = publicProfiles.find(p => p.user_email === friendEmail);
                    return (
                      <Card key={friendship.id} className="bg-[#1E2F43] border-[#E0D8C8]/15">
                        <CardContent className="p-4">
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            {friendRequests.length === 0 ? (
              <Card className="bg-[#223447] border-[#E0D8C8]/15">
                <CardContent className="py-12 text-center text-[#E0D8C8]/70">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>{t("communityExtended.noPendingRequests")}</p>
                  <p className="text-sm mt-2">{t("communityExtended.noPendingRequestsDesc")}</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#223447] border-[#E0D8C8]/15">
                <CardHeader>
                  <CardTitle className="text-[#E0D8C8]">{t("communityExtended.pendingFriendRequests")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {friendRequests.map((request) => {
                    const profile = publicProfiles.find(p => p.user_email === request.requester_email);
                    return (
                      <Card key={request.id} className="bg-[#1E2F43] border-[#E0D8C8]/15">
                        <CardContent className="p-4">
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
                            <div className="flex flex-col gap-2 flex-shrink-0">
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-4">
            {connections.length === 0 ? (
              <Card className="bg-[#223447] border-[#E0D8C8]/15">
                <CardContent className="py-12 text-center text-[#E0D8C8]/70">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>{t("communityExtended.notFollowingAnyone")}</p>
                  <p className="text-sm mt-2">{t("communityExtended.notFollowingAnyoneDesc")}</p>
                  <a href={createPageUrl('Community')}>
                    <Button className="mt-4" onClick={() => setActiveTab && setActiveTab('discover')}>
                      <Search className="w-4 h-4 mr-2" />
                      {t("communityExtended.exploreCommunity")}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ) : (
              connections.map((connection) => {
                const profile = publicProfiles.find(p => p.user_email === connection.following_email);
                return (
                  <Card key={connection.id} className="bg-[#223447] border-[#E0D8C8]/15">
                    <CardContent className="p-4">
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
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="myprofile">
            <Card className="bg-[#223447] border-[#E0D8C8]/15">
              <CardHeader>
                <div className="flex items-center justify-between">
                <CardTitle className="text-[#E0D8C8]">{t("communityExtended.yourPublicProfile")}</CardTitle>
                {user?.email && (
                  <a href={createPageUrl(`PublicProfile?email=${encodeURIComponent(user.email)}${userProfile?.is_public ? '' : '&preview=true'}`)}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      {userProfile?.is_public ? t("communityExtended.viewProfile") : t("communityExtended.previewProfile")}
                    </Button>
                  </a>
                )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {userProfile?.is_public ? (
                  <>
                    <div className="p-4 bg-[#2EAF6F]/20 border border-[#2EAF6F]/30 rounded-lg">
                      <p className="text-sm text-[#2EAF6F]">
                        ✅ {t("communityExtended.profilePublic")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-[#E0D8C8]">{t("communityExtended.profileSettings")}</h4>
                      <p className="text-sm text-[#E0D8C8]/70">
                        {t("communityExtended.displayName")}: <strong>{userProfile.display_name || t("communityExtended.notSet")}</strong>
                      </p>
                      {userProfile.bio && (
                        <p className="text-sm text-[#E0D8C8]/70">
                          {t("communityExtended.bio")}: {userProfile.bio}
                        </p>
                      )}
                      <p className="text-sm text-[#E0D8C8]/70">
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
                    <div className="p-4 bg-[#1E2F43] border border-[#E0D8C8]/15 rounded-lg">
                      <p className="text-sm text-[#E0D8C8]/70 mb-2">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invite">
            <Card className="bg-[#223447] border-[#E0D8C8]/15">
              <CardHeader>
                <CardTitle className="text-[#E0D8C8]">{t("communityExtended.inviteFriends")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#E0D8C8]/70 mb-4">
                  {t("communityExtended.inviteFriendsDesc")}
                </p>
                <a href={createPageUrl('Invite')}>
                  <Button>
                    <Mail className="w-4 h-4 mr-2" />
                    {t("communityExtended.sendInvitations")}
                  </Button>
                </a>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}