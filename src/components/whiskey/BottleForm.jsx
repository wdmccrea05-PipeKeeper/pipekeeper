import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function BottleForm({ bottle, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(
    bottle || {
      name: '',
      distillery: '',
      region: '',
      country: '',
      type: 'Other',
      age: '',
      abv: '',
      bottle_size: '750ml',
      purchase_price: '',
      purchase_location: '',
      purchase_date: '',
      notes: '',
      rating: '',
      fill_level: 'Full',
      opened_date: '',
      bottle_count: 1,
      favorite: false,
    }
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div
      className="w-full max-w-2xl rounded-2xl p-6 space-y-6"
      style={{
        background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.95), rgba(31, 21, 16, 0.98))',
        border: '1px solid rgba(180, 140, 75, 0.25)',
      }}
    >
      <div className="flex items-center justify-between">
        <h2 style={{ color: '#F5F1E7' }} className="text-2xl font-bold">
          {bottle ? 'Edit Bottle' : 'Add Bottle'}
        </h2>
        <button onClick={onCancel} className="text-[#E0D8C8]/70 hover:text-[#E0D8C8]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Distillery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Bottle name"
              required
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Distillery</label>
            <Input
              value={formData.distillery}
              onChange={(e) => handleChange('distillery', e.target.value)}
              placeholder="Distillery name"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
        </div>

        {/* Region & Country */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Region</label>
            <Input
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
              placeholder="e.g., Islay, Speyside"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Country</label>
            <Input
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              placeholder="e.g., Scotland, USA"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
        </div>

        {/* Type & Age */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Type</label>
            <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single Malt">Single Malt</SelectItem>
                <SelectItem value="Blended Malt">Blended Malt</SelectItem>
                <SelectItem value="Single Grain">Single Grain</SelectItem>
                <SelectItem value="Blended Grain">Blended Grain</SelectItem>
                <SelectItem value="Blended Whiskey">Blended Whiskey</SelectItem>
                <SelectItem value="Bourbon">Bourbon</SelectItem>
                <SelectItem value="Rye">Rye</SelectItem>
                <SelectItem value="Tennessee Whiskey">Tennessee Whiskey</SelectItem>
                <SelectItem value="Irish Whiskey">Irish Whiskey</SelectItem>
                <SelectItem value="Scotch Whisky">Scotch Whisky</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Age (years)</label>
            <Input
              type="number"
              value={formData.age}
              onChange={(e) => handleChange('age', e.target.value)}
              placeholder="e.g., 12"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
        </div>

        {/* ABV & Bottle Size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">ABV (%)</label>
            <Input
              type="number"
              step="0.1"
              value={formData.abv}
              onChange={(e) => handleChange('abv', e.target.value)}
              placeholder="e.g., 43.0"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Bottle Size</label>
            <Select value={formData.bottle_size} onValueChange={(value) => handleChange('bottle_size', value)}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50ml">50ml</SelectItem>
                <SelectItem value="100ml">100ml</SelectItem>
                <SelectItem value="200ml">200ml</SelectItem>
                <SelectItem value="375ml">375ml</SelectItem>
                <SelectItem value="500ml">500ml</SelectItem>
                <SelectItem value="700ml">700ml</SelectItem>
                <SelectItem value="750ml">750ml</SelectItem>
                <SelectItem value="1L">1L</SelectItem>
                <SelectItem value="1.75L">1.75L</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Purchase Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Price ($)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.purchase_price}
              onChange={(e) => handleChange('purchase_price', e.target.value)}
              placeholder="0.00"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Purchase Location</label>
            <Input
              value={formData.purchase_location}
              onChange={(e) => handleChange('purchase_location', e.target.value)}
              placeholder="Store, distillery, etc."
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Purchase Date</label>
            <Input
              type="date"
              value={formData.purchase_date}
              onChange={(e) => handleChange('purchase_date', e.target.value)}
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
        </div>

        {/* Inventory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Fill Level</label>
            <Select value={formData.fill_level} onValueChange={(value) => handleChange('fill_level', value)}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full">Full</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Empty">Empty</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">Bottle Count</label>
            <Input
              type="number"
              min="1"
              value={formData.bottle_count}
              onChange={(e) => handleChange('bottle_count', e.target.value)}
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
        </div>

        {/* Rating */}
        <div>
          <label className="text-sm text-[#D8C7A6] block mb-2">Rating (1-5)</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="5"
            value={formData.rating}
            onChange={(e) => handleChange('rating', e.target.value)}
            placeholder="5.0"
            className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm text-[#D8C7A6] block mb-2">Tasting Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Describe the flavor profile, aromas, etc."
            className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] h-24"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, rgba(163, 92, 92, 1), rgba(140, 74, 74, 1))',
              color: '#F5F1E7',
            }}
          >
            {bottle ? 'Update Bottle' : 'Add Bottle'}
          </Button>
        </div>
      </form>
    </div>
  );
}