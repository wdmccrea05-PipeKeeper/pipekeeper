import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function PipeConditionTracker({ pipe, onUpdate }) {
  const condition = pipe.condition_tracking || {
    overall_condition: pipe.condition || 'Good',
    cake_level: 50,
    stem_oxidation: 0,
    wear_level: 20,
    last_cleaned: null,
    last_maintenance: null,
  };

  const handleUpdate = (field, value) => {
    onUpdate({
      condition_tracking: {
        ...condition,
        [field]: value,
      }
    });
  };

  const getCakeStatus = () => {
    if (condition.cake_level < 30) return { label: 'Thin', color: 'text-yellow-600', icon: AlertCircle };
    if (condition.cake_level > 70) return { label: 'Thick', color: 'text-orange-600', icon: AlertCircle };
    return { label: 'Good', color: 'text-green-600', icon: CheckCircle };
  };

  const getStemStatus = () => {
    if (condition.stem_oxidation > 60) return { label: 'Heavy Oxidation', color: 'text-red-600', icon: AlertCircle };
    if (condition.stem_oxidation > 30) return { label: 'Moderate Oxidation', color: 'text-yellow-600', icon: AlertCircle };
    return { label: 'Good', color: 'text-green-600', icon: CheckCircle };
  };

  const cakeStatus = getCakeStatus();
  const stemStatus = getStemStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Condition Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Overall Condition</Label>
          <Select 
            value={condition.overall_condition} 
            onValueChange={(value) => handleUpdate('overall_condition', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mint">Mint</SelectItem>
              <SelectItem value="Excellent">Excellent</SelectItem>
              <SelectItem value="Very Good">Very Good</SelectItem>
              <SelectItem value="Good">Good</SelectItem>
              <SelectItem value="Fair">Fair</SelectItem>
              <SelectItem value="Poor">Poor</SelectItem>
              <SelectItem value="Estate - Unrestored">Estate - Unrestored</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Cake Level</Label>
            <div className="flex items-center gap-2">
              <cakeStatus.icon className={`w-4 h-4 ${cakeStatus.color}`} />
              <Badge variant="outline" className={cakeStatus.color}>
                {cakeStatus.label}
              </Badge>
            </div>
          </div>
          <Slider
            value={[condition.cake_level]}
            onValueChange={([value]) => handleUpdate('cake_level', value)}
            max={100}
            step={5}
            className="mb-2"
          />
          <p className="text-xs text-stone-500">
            {condition.cake_level}% - Optimal range: 30-70%
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Stem Oxidation</Label>
            <div className="flex items-center gap-2">
              <stemStatus.icon className={`w-4 h-4 ${stemStatus.color}`} />
              <Badge variant="outline" className={stemStatus.color}>
                {stemStatus.label}
              </Badge>
            </div>
          </div>
          <Slider
            value={[condition.stem_oxidation]}
            onValueChange={([value]) => handleUpdate('stem_oxidation', value)}
            max={100}
            step={5}
            className="mb-2"
          />
          <p className="text-xs text-stone-500">
            {condition.stem_oxidation}% oxidation
          </p>
        </div>

        <div>
          <Label className="mb-2 block">General Wear</Label>
          <Slider
            value={[condition.wear_level]}
            onValueChange={([value]) => handleUpdate('wear_level', value)}
            max={100}
            step={5}
            className="mb-2"
          />
          <p className="text-xs text-stone-500">
            {condition.wear_level}% wear - {
              condition.wear_level < 20 ? 'Minimal wear' :
              condition.wear_level < 50 ? 'Light wear' :
              condition.wear_level < 75 ? 'Moderate wear' : 'Heavy wear'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}