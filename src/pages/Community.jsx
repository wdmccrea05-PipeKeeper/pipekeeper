import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, UserPlus, Mail, UserCheck, UserX, Eye, Settings, UserCog, CheckCircle, XCircle, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CommunityPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Check if user has paid access
  const trialEndDate = user?.created_date 
    ? new Date(new Date(user.created_date).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const isInTrial = trialEndDate && new Date() < trialEndDate;
  const hasActiveSubscription = user?.subscription_level === 'paid';
  const hasPaidAccess = hasActiveSubscription || isInTrial;

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

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
    let filtered = [...allPublicProfiles];
    
    // Apply name/email search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => 
        p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply location search filter
    if (locationSearch.trim()) {
      const searchLower = locationSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.show_location && (
          p.city?.toLowerCase().includes(searchLower) ||
          p.state_province?.toLowerCase().includes(searchLower) ||
          p.country?.toLowerCase().includes(searchLower) ||
          p.postal_code?.toLowerCase().includes(searchLower)
        )
      );
    }
    
    return filtered;
  }, [allPublicProfiles, searchQuery, locationSearch]);

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
    mutationFn: (friendshipId) => base44.entities.Friendship.update(friendshipId, { status: 'accepted' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  const declineFriendRequestMutation = useMutation({
    mutationFn: (friendshipId) => base44.entities.Friendship.update(friendshipId, { status: 'declined' }),
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
            title="Community Features"
            description="Connect with fellow pipe enthusiasts, share your collection, and discover new pipes and tobacco blends."
            features={[
              "Create a public profile to showcase your collection",
              "Follow other collectors and see their pipes & tobacco",
              "Comment on and discuss collections with the community",
              "Get inspired by other enthusiasts' setups",
              "Share your expertise and learn from others"
            ]}
            icon={<Users className="w-12 h-12" />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#e8d5b7] mb-2">Community</h1>
          <p className="text-[#e8d5b7]/70">Connect with fellow pipe enthusiasts</p>
        </div>

        <Tabs defaultValue="discover" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-white/95 inline-flex min-w-full sm:w-auto">
              <TabsTrigger value="discover" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4">
                <Search className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">Discover</span>
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 relative">
                <UserCog className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">Friends</span>
                {friendRequests.length > 0 && (
                  <Badge className="absolute -top-1 -right-0 sm:relative sm:top-0 sm:right-0 sm:ml-1 bg-amber-600 text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0 min-w-[14px] sm:min-w-[16px]">
                    {friendRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="following" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">Following</span>
              </TabsTrigger>
              <TabsTrigger value="myprofile" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4">
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="invite" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">Invite</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="discover" className="space-y-6">
            {!userProfile?.is_public && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4">
                  <p className="text-sm text-amber-800 mb-2">
                    <strong>Your profile is private.</strong> Enable public visibility in your Profile settings to be discovered by other users.
                  </p>
                  <Link to={createPageUrl('Profile')}>
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-700">
                      Update Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/95">
              <CardHeader>
                <CardTitle className="text-stone-800">Find Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                    <Input
                      placeholder="Search by country, city, state, or zip code..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {publicProfiles.filter(p => p.user_email !== user?.email).map((profile) => (
                    <Card key={profile.id} className="border-stone-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback className="bg-amber-200 text-amber-800">
                              {profile.display_name?.[0] || profile.user_email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Link to={createPageUrl(`PublicProfile?email=${profile.user_email}`)}>
                              <h3 className="font-semibold text-stone-800 hover:text-amber-700">
                                {profile.display_name || profile.user_email}
                              </h3>
                            </Link>
                            {profile.bio && (
                              <p className="text-sm text-stone-600 line-clamp-2">{profile.bio}</p>
                            )}
                            {profile.show_location && (profile.city || profile.state_province || profile.country) && (
                              <p className="text-xs text-stone-500 mt-1">
                                📍 {[profile.city, profile.state_province, profile.country].filter(Boolean).join(', ')}
                              </p>
                            )}
                            {profile.preferred_blend_types?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {profile.preferred_blend_types.slice(0, 3).map((type, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {isFriend(profile.user_email) ? (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                                <UserCheck className="w-3 h-3 mr-1" />
                                Friends
                              </Badge>
                            ) : hasPendingRequest(profile.user_email) ? (
                              <Badge variant="outline" className="text-amber-700 border-amber-300">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendFriendRequestMutation.mutate(profile.user_email)}
                                disabled={sendFriendRequestMutation.isPending}
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add Friend
                              </Button>
                            )}
                            {isFollowing(profile.user_email) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => unfollowMutation.mutate(getConnection(profile.user_email)?.id)}
                                disabled={unfollowMutation.isPending}
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Following
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => followMutation.mutate(profile.user_email)}
                                disabled={followMutation.isPending}
                                className="bg-amber-700 hover:bg-amber-800"
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Follow
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {publicProfiles.filter(p => p.user_email !== user?.email).length === 0 && (
                    <div className="text-center py-12 text-stone-500">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No public profiles found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="friends" className="space-y-6">
            {/* Friend Requests */}
            {friendRequests.length > 0 && (
              <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-900 text-lg">Friend Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {friendRequests.map((request) => {
                    const profile = publicProfiles.find(p => p.user_email === request.requester_email);
                    return (
                      <Card key={request.id} className="bg-white border-amber-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={profile?.avatar_url} />
                              <AvatarFallback className="bg-amber-200 text-amber-800">
                                {profile?.display_name?.[0] || request.requester_email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <Link to={createPageUrl(`PublicProfile?email=${request.requester_email}`)}>
                                <h3 className="font-semibold text-stone-800 hover:text-amber-700">
                                  {profile?.display_name || request.requester_email}
                                </h3>
                              </Link>
                              <p className="text-xs text-stone-500">Wants to be friends</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => acceptFriendRequestMutation.mutate(request.id)}
                                disabled={acceptFriendRequestMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => declineFriendRequestMutation.mutate(request.id)}
                                disabled={declineFriendRequestMutation.isPending}
                                className="text-rose-600 hover:bg-rose-50"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Decline
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

            {/* Friends List */}
            {acceptedFriends.length === 0 ? (
              <Card className="bg-white/95">
                <CardContent className="py-12 text-center text-stone-500">
                  <UserCog className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>You don't have any friends yet</p>
                  <p className="text-sm mt-2">Send friend requests from the Discover tab</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/95">
                <CardHeader>
                  <CardTitle className="text-stone-800">Your Friends</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {acceptedFriends.map((friendship) => {
                    const friendEmail = friendship.requester_email === user?.email 
                      ? friendship.recipient_email 
                      : friendship.requester_email;
                    const profile = publicProfiles.find(p => p.user_email === friendEmail);
                    return (
                      <Card key={friendship.id} className="bg-white/95 border-stone-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={profile?.avatar_url} />
                              <AvatarFallback className="bg-amber-200 text-amber-800">
                                {profile?.display_name?.[0] || friendEmail[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <Link to={createPageUrl(`PublicProfile?email=${friendEmail}`)}>
                                <h3 className="font-semibold text-stone-800 hover:text-amber-700">
                                  {profile?.display_name || friendEmail}
                                </h3>
                              </Link>
                              {profile?.bio && (
                                <p className="text-sm text-stone-600 line-clamp-1">{profile.bio}</p>
                              )}
                              {profile?.show_location && (profile?.city || profile?.state_province || profile?.country) && (
                                <p className="text-xs text-stone-500 mt-1">
                                  📍 {[profile.city, profile.state_province, profile.country].filter(Boolean).join(', ')}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm('Remove this friend?')) {
                                  removeFriendMutation.mutate(friendship.id);
                                }
                              }}
                              disabled={removeFriendMutation.isPending}
                              className="text-rose-600 hover:bg-rose-50"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Remove
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

          <TabsContent value="following" className="space-y-4">
            {connections.length === 0 ? (
              <Card className="bg-white/95">
                <CardContent className="py-12 text-center text-stone-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>You're not following anyone yet</p>
                  <p className="text-sm mt-2">Discover users to follow in the Discover tab</p>
                </CardContent>
              </Card>
            ) : (
              connections.map((connection) => {
                const profile = publicProfiles.find(p => p.user_email === connection.following_email);
                return (
                  <Card key={connection.id} className="bg-white/95 border-stone-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback className="bg-amber-200 text-amber-800">
                            {profile?.display_name?.[0] || connection.following_email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Link to={createPageUrl(`PublicProfile?email=${connection.following_email}`)}>
                            <h3 className="font-semibold text-stone-800 hover:text-amber-700">
                              {profile?.display_name || connection.following_email}
                            </h3>
                          </Link>
                          {profile?.bio && (
                            <p className="text-sm text-stone-600 line-clamp-1">{profile.bio}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unfollowMutation.mutate(connection.id)}
                          disabled={unfollowMutation.isPending}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Unfollow
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="myprofile">
            <Card className="bg-white/95">
              <CardHeader>
                <div className="flex items-center justify-between">
                <CardTitle className="text-stone-800">Your Public Profile</CardTitle>
                {user?.email && (
                  <Link to={createPageUrl(`PublicProfile?email=${user.email}${userProfile?.is_public ? '' : '&preview=true'}`)}>
                    <Button variant="outline" size="sm" className="border-amber-300 text-amber-700">
                      <Eye className="w-4 h-4 mr-2" />
                      {userProfile?.is_public ? 'View Profile' : 'Preview Profile'}
                    </Button>
                  </Link>
                )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {userProfile?.is_public ? (
                  <>
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-800">
                        ✅ Your profile is public and searchable by other users.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-stone-800">Profile Settings</h4>
                      <p className="text-sm text-stone-600">
                        Display Name: <strong>{userProfile.display_name || 'Not set'}</strong>
                      </p>
                      {userProfile.bio && (
                        <p className="text-sm text-stone-600">
                          Bio: {userProfile.bio}
                        </p>
                      )}
                      <p className="text-sm text-stone-600">
                        Comments: <strong>{userProfile.allow_comments ? 'Enabled' : 'Disabled'}</strong>
                      </p>
                    </div>
                    <Link to={createPageUrl('Profile')}>
                      <Button variant="outline" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Profile Settings
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 mb-2">
                        Your profile is currently private. Enable public visibility to connect with other users.
                      </p>
                    </div>
                    <Link to={createPageUrl('Profile')}>
                      <Button className="w-full bg-amber-700 hover:bg-amber-800">
                        <Settings className="w-4 h-4 mr-2" />
                        Make Profile Public
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invite">
            <Card className="bg-white/95">
              <CardHeader>
                <CardTitle className="text-stone-800">Invite Friends to PipeKeeper</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-stone-600 mb-4">
                  Know someone who would love PipeKeeper? Invite them to join the community!
                </p>
                <Link to={createPageUrl('Invite')}>
                  <Button className="bg-amber-700 hover:bg-amber-800">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitations
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}