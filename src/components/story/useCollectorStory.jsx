/**
 * Hook for generating and caching collector stories
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { storyEngine } from './storyEngine';

export function useCollectorStory(user) {
  return useQuery({
    queryKey: ['collector-story', user?.email],
    queryFn: async () => {
      if (!user?.email) {
        return [];
      }

      try {
        // Fetch all collection data
        const [pipes, blends, logs] = await Promise.all([
          base44.entities.Pipe.list(),
          base44.entities.TobaccoBlend.list(),
          base44.entities.SmokingLog.list()
        ]);

        // Generate story cards
        const cards = storyEngine.generateCollectorStory({
          pipes: pipes || [],
          blends: blends || [],
          logs: logs || []
        });

        return cards;
      } catch (error) {
        console.error('Failed to generate story:', error);
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
    gcTime: 1000 * 60 * 60 * 24
  });
}