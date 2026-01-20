import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Optimistic favorite toggle for pipes
export function useOptimisticPipeFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pipeId, isFavorite }) => {
      await base44.entities.Pipe.update(pipeId, { is_favorite: isFavorite });
      return { pipeId, isFavorite };
    },
    onMutate: async ({ pipeId, isFavorite }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['pipes'] });
      await queryClient.cancelQueries({ queryKey: ['pipe', pipeId] });

      // Snapshot previous values
      const previousPipes = queryClient.getQueryData(['pipes']);
      const previousPipe = queryClient.getQueryData(['pipe', pipeId]);

      // Optimistically update
      queryClient.setQueryData(['pipes'], (old) =>
        old?.map(p => p.id === pipeId ? { ...p, is_favorite: isFavorite } : p)
      );
      queryClient.setQueryData(['pipe', pipeId], (old) =>
        old ? { ...old, is_favorite: isFavorite } : old
      );

      return { previousPipes, previousPipe };
    },
    onError: (err, { pipeId }, context) => {
      // Rollback on error
      queryClient.setQueryData(['pipes'], context.previousPipes);
      queryClient.setQueryData(['pipe', pipeId], context.previousPipe);
      toast.error('Failed to update favorite');
    },
    onSuccess: ({ isFavorite }) => {
      toast.success(isFavorite ? 'Added to favorites' : 'Removed from favorites');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipes'] });
    },
  });
}

// Optimistic favorite toggle for tobacco
export function useOptimisticBlendFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blendId, isFavorite }) => {
      await base44.entities.TobaccoBlend.update(blendId, { is_favorite: isFavorite });
      return { blendId, isFavorite };
    },
    onMutate: async ({ blendId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['tobacco'] });
      await queryClient.cancelQueries({ queryKey: ['blend', blendId] });

      const previousBlends = queryClient.getQueryData(['tobacco']);
      const previousBlend = queryClient.getQueryData(['blend', blendId]);

      queryClient.setQueryData(['tobacco'], (old) =>
        old?.map(b => b.id === blendId ? { ...b, is_favorite: isFavorite } : b)
      );
      queryClient.setQueryData(['blend', blendId], (old) =>
        old ? { ...old, is_favorite: isFavorite } : old
      );

      return { previousBlends, previousBlend };
    },
    onError: (err, { blendId }, context) => {
      queryClient.setQueryData(['tobacco'], context.previousBlends);
      queryClient.setQueryData(['blend', blendId], context.previousBlend);
      toast.error('Failed to update favorite');
    },
    onSuccess: ({ isFavorite }) => {
      toast.success(isFavorite ? 'Added to favorites' : 'Removed from favorites');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tobacco'] });
    },
  });
}

// Optimistic rating update for tobacco
export function useOptimisticBlendRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blendId, rating }) => {
      await base44.entities.TobaccoBlend.update(blendId, { rating });
      return { blendId, rating };
    },
    onMutate: async ({ blendId, rating }) => {
      await queryClient.cancelQueries({ queryKey: ['tobacco'] });
      await queryClient.cancelQueries({ queryKey: ['blend', blendId] });

      const previousBlends = queryClient.getQueryData(['tobacco']);
      const previousBlend = queryClient.getQueryData(['blend', blendId]);

      queryClient.setQueryData(['tobacco'], (old) =>
        old?.map(b => b.id === blendId ? { ...b, rating } : b)
      );
      queryClient.setQueryData(['blend', blendId], (old) =>
        old ? { ...old, rating } : old
      );

      return { previousBlends, previousBlend };
    },
    onError: (err, { blendId }, context) => {
      queryClient.setQueryData(['tobacco'], context.previousBlends);
      queryClient.setQueryData(['blend', blendId], context.previousBlend);
      toast.error('Failed to update rating');
    },
    onSuccess: () => {
      toast.success('Rating updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tobacco'] });
    },
  });
}

// Optimistic notes update
export function useOptimisticNotesUpdate(entityType) {
  const queryClient = useQueryClient();
  const entity = entityType === 'pipe' ? 'Pipe' : 'TobaccoBlend';
  const queryKey = entityType === 'pipe' ? 'pipe' : 'blend';

  return useMutation({
    mutationFn: async ({ id, notes }) => {
      await base44.entities[entity].update(id, { notes });
      return { id, notes };
    },
    onMutate: async ({ id, notes }) => {
      await queryClient.cancelQueries({ queryKey: [queryKey, id] });

      const previous = queryClient.getQueryData([queryKey, id]);

      queryClient.setQueryData([queryKey, id], (old) =>
        old ? { ...old, notes } : old
      );

      return { previous };
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData([queryKey, id], context.previous);
      toast.error('Failed to save notes');
    },
    onSuccess: () => {
      toast.success('Notes saved');
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: [queryKey, id] });
    },
  });
}