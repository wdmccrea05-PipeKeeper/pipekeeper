import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, UserPlus, Mail, UserCheck, UserX, Eye, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CommunityPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

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

  const { data: publicProfiles = [] } = useQuery({
    queryKey: ['public-profiles', searchQuery],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ is_public: true });
      if (!searchQuery.trim()) return profiles;
      return profiles.filter(p => 
        p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    },
  });

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

  const isFollowing = (email) => {
    return connections.some(c => c.following_email === email);
  };

  const getConnection = (email) => {
    return connections.find(c => c.following_email === email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#e8d5b7] mb-2">Community</h1>
          <p className="text-[#e8d5b7]/70">Connect with fellow pipe enthusiasts</p>
        </div>

        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="bg-white/95">
            <TabsTrigger value="discover">
              <Search className="w-4 h-4 mr-2" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="following">
              <Users className="w-4 h-4 mr-2" />
              Following ({connections.length})
            </TabsTrigger>
            <TabsTrigger value="myprofile">
              <UserPlus className="w-4 h-4 mr-2" />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="invite">
              <Mail className="w-4 h-4 mr-2" />
              Invite Friends
            </TabsTrigger>
          </TabsList>

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
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
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
                  {userProfile?.is_public && user?.email && (
                    <Link to={createPageUrl(`PublicProfile?email=${user.email}`)}>
                      <Button variant="outline" size="sm" className="border-amber-300 text-amber-700">
                        <Eye className="w-4 h-4 mr-2" />
                        Preview Profile
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