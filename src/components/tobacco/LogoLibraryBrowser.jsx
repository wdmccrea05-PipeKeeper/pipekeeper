import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check } from "lucide-react";
import { getAvailableBrands, getTobaccoLogo } from "@/components/tobacco/TobaccoLogoLibrary";

export default function LogoLibraryBrowser({ open, onClose, onSelect, currentLogo }) {
  const [searchQuery, setSearchQuery] = useState('');
  const allBrands = getAvailableBrands();
  
  const filteredBrands = allBrands.filter(brand => 
    brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (brand) => {
    const logo = getTobaccoLogo(brand);
    onSelect(logo);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Logo Library</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands..."
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredBrands.map((brand) => {
                const logo = getTobaccoLogo(brand);
                const isSelected = currentLogo === logo;
                
                return (
                  <button
                    key={brand}
                    onClick={() => handleSelect(brand)}
                    className={`relative aspect-square rounded-lg border-2 transition-all hover:border-amber-500 ${
                      isSelected 
                        ? 'border-amber-600 bg-amber-100' 
                        : 'border-stone-200 bg-white'
                    }`}
                  >
                    <img 
                      src={logo} 
                      alt={brand}
                      className="w-full h-full object-contain p-2"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-amber-600 rounded-full p-1">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <p className="text-xs text-stone-600 mt-1 px-1 truncate">{brand}</p>
                  </button>
                );
              })}
            </div>
            
            {filteredBrands.length === 0 && (
              <div className="text-center py-12 text-stone-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No brands found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}