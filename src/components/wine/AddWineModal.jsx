import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import AddFlowModal from '@/components/addflow/AddFlowModal';

export default function AddWineModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['wines', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['wine-collection-summary', user?.email] });
  };

  return (
    <AddFlowModal
      open={open}
      onClose={onClose}
      onCreated={handleCreated}
      initialItemType="wine"
    />
  );
}