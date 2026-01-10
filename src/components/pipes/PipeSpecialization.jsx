import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/components/utils/createPageUrl";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { invalidateAIQueries } from "@/components/utils/cacheInvalidation";
import { useQueryClient } from "@tanstack/react-query";

export default function PipeSpecialization({ pipe, blends, onUpdate, isPaidUser }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [newDesignation, setNewDesignation] = useState('');
  const [designations, setDesignations] = useState(pipe.focus || []);
  const [isAdding, setIsAdding] = useState(false);
  
  const suggestedFocusOptions = [
    'Aromatic',
    'Non-Aromatic',
    'English',
    'Virginia',
    'Virginia/Perique',
    'Balkan',
    'Latakia Blend',
    'Burley'
  ];

  const handleAdd = () => {
    if (newDesignation.trim()) {
      const updated = [...designations, newDesignation.trim()];
      setDesignations(updated);
      setNewDesignation('');
      onUpdate({ focus: updated });
      // Invalidate AI queries when focus changes
      invalidateAIQueries(queryClient, pipe.created_by);
    }
  };

  const handleRemove = (index) => {
    const updated = designations.filter((_, i) => i !== index);
    setDesignations(updated);
    onUpdate({ focus: updated });
    // Invalidate AI queries when focus changes
    invalidateAIQueries(queryClient, pipe.created_by);
  };

  // Find matching blends based on designations
  const hasNonAromaticFocus = designations.some(d => 
    d.toLowerCase().includes('non-aromatic') || d.toLowerCase().includes('non aromatic')
  );
  const hasAromaticFocus = designations.some(d => 
    d.toLowerCase() === 'aromatic' && !d.toLowerCase().includes('non')
  );
  
  const matchingBlends = blends.filter(blend => {
    const isAromaticBlend = blend.blend_type?.toLowerCase() === 'aromatic';
    
    // Exclude aromatics if non-aromatic focus
    if (hasNonAromaticFocus && isAromaticBlend) return false;
    
    // Exclude non-aromatics if aromatic focus
    if (hasAromaticFocus && !isAromaticBlend) return false;
    
    // Otherwise match on blend type
    return designations.some(designation => 
      blend.blend_type?.toLowerCase().includes(designation.toLowerCase()) ||
      designation.toLowerCase().includes(blend.blend_type?.toLowerCase())
    );
  });

  if (!isPaidUser) {
    return (
      <UpgradePrompt 
        featureName="Pipe Specialization"
        description="Designate each pipe for specific tobacco types (English, Virginia, Aromatic, etc.) and see which blends from your collection match perfectly."
      />
    );
  }

  if (!editing && (!designations || designations.length === 0)) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-stone-600">No specialization set</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Specialization
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-800">Pipe Specialization</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Done' : 'Edit'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {designations.map((designation, idx) => (
            <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-200 pr-1">
              {designation}
              {editing && (
                <button
                  onClick={() => handleRemove(idx)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>

        {editing && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add designation (e.g., English, Non-Aromatic)"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                className="text-sm"
              />
              <Button size="sm" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <p className="text-xs text-stone-500 w-full mb-1">Quick add:</p>
              {suggestedFocusOptions.map(option => (
                <Badge
                  key={option}
                  variant="outline"
                  className="cursor-pointer hover:bg-blue-100 text-xs border-blue-200"
                  onClick={() => {
                    setNewDesignation(option);
                  }}
                >
                  {option}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {matchingBlends.length > 0 && (
          <div>
            <p className="text-xs font-medium text-blue-700 mb-2">Matching Blends in Collection:</p>
            <div className="flex flex-wrap gap-1.5">
              {matchingBlends.slice(0, 5).map(blend => (
                <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 border-blue-200 text-blue-700">
                    {blend.name}
                  </Badge>
                </a>
              ))}
              {matchingBlends.length > 5 && (
                <Badge variant="outline" className="border-blue-200 text-blue-600">
                  +{matchingBlends.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}