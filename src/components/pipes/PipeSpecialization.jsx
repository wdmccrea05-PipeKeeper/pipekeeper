import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PipeSpecialization({ pipe, blends, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [newDesignation, setNewDesignation] = useState('');
  const [designations, setDesignations] = useState(pipe.focus || []);

  const handleAdd = () => {
    if (newDesignation.trim()) {
      const updated = [...designations, newDesignation.trim()];
      setDesignations(updated);
      setNewDesignation('');
      onUpdate({ focus: updated });
    }
  };

  const handleRemove = (index) => {
    const updated = designations.filter((_, i) => i !== index);
    setDesignations(updated);
    onUpdate({ focus: updated });
  };

  // Find matching blends based on designations
  const matchingBlends = blends.filter(blend => 
    designations.some(designation => 
      blend.blend_type?.toLowerCase().includes(designation.toLowerCase()) ||
      designation.toLowerCase().includes(blend.blend_type?.toLowerCase())
    )
  );

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
          <div className="flex gap-2">
            <Input
              placeholder="Add designation (e.g., English blends, Virginias)"
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              className="text-sm"
            />
            <Button size="sm" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {matchingBlends.length > 0 && (
          <div>
            <p className="text-xs font-medium text-blue-700 mb-2">Matching Blends in Collection:</p>
            <div className="flex flex-wrap gap-1.5">
              {matchingBlends.slice(0, 5).map(blend => (
                <Link key={blend.id} to={createPageUrl(`TobaccoDetail?id=${blend.id}`)}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 border-blue-200 text-blue-700">
                    {blend.name}
                  </Badge>
                </Link>
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