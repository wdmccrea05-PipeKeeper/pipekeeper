import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import CigarForm from '@/components/cigars/CigarForm';

export default function AddCigarModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  const handleSubmit = () => {
    queryClient.invalidateQueries({ queryKey: ['cigars', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['cigars-summary', user?.email] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(145deg, rgba(40,28,18,0.98), rgba(27,19,13,0.99))',
          border: '1px solid rgba(140,107,63,0.35)',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            Add Cigar
          </DialogTitle>
        </DialogHeader>
        <CigarForm
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}