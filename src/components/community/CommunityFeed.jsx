import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Rss } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import PostComposer from "@/components/community/PostComposer";
import PostCard from "@/components/community/PostCard";

const PAGE_SIZE = 20;

export default function CommunityFeed({ user, profile, friends = [] }) {
  const { t } = useTranslation();
  const [scope, setScope] = useState('all');
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const buildQuery = useCallback(
    () => (scope === 'mine' ? { author_email: user?.email } : { is_hidden: false }),
    [scope, user?.email]
  );

  const loadFirstPage = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    const page = await base44.entities.CommunityPost.filter(buildQuery(), {
      sort: '-created_date',
      limit: PAGE_SIZE,
    });
    setPosts(page?.items || []);
    setCursor(page?.next_cursor || null);
    setHasMore(!!page?.has_more);
    setLoading(false);
  }, [buildQuery, user?.email]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    const page = await base44.entities.CommunityPost.filter(buildQuery(), {
      sort: '-created_date',
      limit: PAGE_SIZE,
      cursor,
    });
    setPosts((prev) => [...prev, ...(page?.items || [])]);
    setCursor(page?.next_cursor || null);
    setHasMore(!!page?.has_more);
    setLoadingMore(false);
  };

  return (
    <div className="space-y-5">
      <PostComposer user={user} profile={profile} onPosted={loadFirstPage} />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={scope === 'all' ? 'default' : 'outline'}
          onClick={() => setScope('all')}
        >
          {t('communityFeed.allPosts', 'Community')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={scope === 'mine' ? 'default' : 'outline'}
          onClick={() => setScope('mine')}
        >
          {t('communityFeed.myPosts', 'My posts')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto text-[#E0D8C8]/70"
          onClick={loadFirstPage}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4A574]" />
        </div>
      ) : posts.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ background: 'rgba(42,30,20,0.6)', border: '1px solid rgba(120,90,65,0.25)' }}
        >
          <Rss className="w-8 h-8 mx-auto mb-3 text-[#D4A574]/70" />
          <p className="text-sm text-[#E0D8C8]/75">
            {scope === 'mine'
              ? t('communityFeed.emptyMine', "You haven't posted yet. Share your latest find above.")
              : t('communityFeed.emptyAll', 'No community posts yet. Be the first to share something.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              friends={friends}
              onChanged={loadFirstPage}
            />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('common.loadMore', 'Load more')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}