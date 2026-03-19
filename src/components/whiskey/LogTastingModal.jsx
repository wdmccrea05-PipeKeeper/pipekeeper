import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export default function LogTastingModal({ bottle, onClose }) {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!bottle?.id) return;

    setLoading(true);
    try {
      await base44.entities.TastingLog.create({
        bottle_id: bottle.id,
        bottle_name: bottle.name,
        rating: Number(rating) || 0,
        notes,
        tasting_date: new Date().toISOString(),
      });

      toast.success('Tasting logged');
      queryClient.invalidateQueries({ queryKey: ['tasting-logs-bottle', bottle.id] });
      onClose();
    } catch (err) {
      console.error('Failed to save tasting:', err);
      toast.error('Failed to save tasting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a120d] p-6 rounded-xl w-full max-w-[450px] border border-[#3a2a1f]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#F5F1E7]">Log Tasting</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#2c1f16] rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm opacity-70 mb-4">{bottle?.name}</p>

        {/* RATING */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Rating (0–5)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="5"
              step="0.5"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-24 p-2 bg-[#2c1f16] border border-[#3a2a1f] rounded text-[#F5F1E7]"
            />
            <span className="text-lg">
              {rating > 0 && '⭐'.repeat(Math.min(5, Math.floor(rating)))}
            </span>
          </div>
        </div>

        {/* NOTES */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-32 p-3 bg-[#2c1f16] border border-[#3a2a1f] rounded text-[#F5F1E7] resize-none"
            placeholder="What did you think?"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !bottle}
            className="flex-1 bg-[#A35C5C]"
          >
            {loading ? 'Saving...' : 'Save Tasting'}
          </Button>
        </div>
      </div>
    </div>
  );
}