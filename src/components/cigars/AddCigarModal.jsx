import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import AddFlowModal from '@/components/addflow/AddFlowModal';

export default function AddCigarModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['cigars', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['cigars-summary', user?.email] });
  };

  return (
    <AddFlowModal
      open={open}
      onClose={onClose}
      onCreated={handleCreated}
      initialItemType="cigar"
    />
  );
}