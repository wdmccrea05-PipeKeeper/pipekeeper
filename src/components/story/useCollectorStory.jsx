/**
 * @deprecated — useCollectorStory and storyEngine are retired.
 * The canonical story path is CollectionStoryCard (backend-driven via generateCollectionStory).
 * StoryButton now uses that path directly.
 * This file is kept only to avoid breaking any residual imports during the transition.
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';
import { storyEngine } from './storyEngine';

export function useCollectorStory(user) {
  const { enabled } = useEnabledModules();

  return useQuery({
    queryKey: ['collector-story', user?.email, !!enabled.whiskeykeeper],
    queryFn: async () => {
      if (!user?.email) return [];

      try {
        const fetchPipe = Promise.all([
          base44.entities.Pipe.filter({ created_by: user.email }),
          base44.entities.TobaccoBlend.filter({ created_by: user.email }),
          base44.entities.SmokingLog.filter({ created_by: user.email }),
        ]);

        const fetchWhiskey = enabled.whiskeykeeper
          ? Promise.all([
              base44.entities.Bottle.filter({ created_by: user.email }).catch(() => []),
              base44.entities.TastingLog.filter({ created_by: user.email }, '-tasting_date', 250).catch(() => []),
            ])
          : Promise.resolve([[], []]);

        const [[pipes, blends, logs], [bottles, tastings]] = await Promise.all([fetchPipe, fetchWhiskey]);

        return storyEngine.generateCollectorStory({
          pipes: pipes || [],
          blends: blends || [],
          logs: logs || [],
          bottles: bottles || [],
          tastings: tastings || [],
        });
      } catch (error) {
        console.error('Failed to generate story:', error);
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
  });
}