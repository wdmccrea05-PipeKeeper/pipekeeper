import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AddFlowEntry from './AddFlowEntry';
import AddFlowQuickAdd from './AddFlowQuickAdd';
import AddFlowSearchStep from './AddFlowSearchStep';
import AddFlowConfirmStep from './AddFlowConfirmStep';
import AddFlowEnhancementStep from './AddFlowEnhancementStep';
import AddFlowProcessingStep from './AddFlowProcessingStep';

export default function AddFlowModal({ open, onClose, onCreated, initialItemType }) {
  const [step, setStep] = useState('entry');
  const [itemType, setItemType] = useState(initialItemType || null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (open) {
      setStep(initialItemType ? 'modeSelect' : 'entry');
      setItemType(initialItemType || null);
      setSelectedItem(null);
    }
  }, [open, initialItemType]);

  const handleClose = () => {
    onClose();
  };

  const handleEntrySelectType = (type) => {
    setItemType(type);
    setStep('modeSelect');
  };

  const handleModeSelect = (mode) => {
    if (mode === 'quick') setStep('quickAdd');
    else setStep('search');
  };

  const handleSearchSelect = (item) => {
    setSelectedItem(item);
    setStep('confirm');
  };

  const handleConfirm = () => {
    setStep('enhancements');
  };

  const handleEnhancementsConfirm = () => {
    setStep('processing');
  };

  const handleCreated = (record) => {
    onCreated?.(record);
    handleClose();
  };

  const handleBack = () => {
    if (step === 'modeSelect') {
      if (initialItemType) { handleClose(); return; }
      setStep('entry');
    } else if (step === 'quickAdd') setStep('modeSelect');
    else if (step === 'search') setStep('modeSelect');
    else if (step === 'confirm') setStep('search');
    else if (step === 'enhancements') setStep('confirm');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        className="max-w-md w-full p-0 overflow-hidden border-0"
        style={{
          background: 'linear-gradient(180deg, rgba(36,25,16,0.99) 0%, rgba(22,15,10,1) 100%)',
          border: '1px solid rgba(180,140,75,0.22)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {step === 'entry' && (
          <AddFlowEntry onSelectType={handleEntrySelectType} onClose={handleClose} />
        )}
        {step === 'modeSelect' && (
          <AddFlowEntry
            fixedType={itemType}
            onSelectType={handleEntrySelectType}
            onSelectMode={handleModeSelect}
            onClose={handleClose}
            onBack={handleBack}
          />
        )}
        {step === 'quickAdd' && (
          <AddFlowQuickAdd itemType={itemType} onBack={handleBack} onCreated={handleCreated} />
        )}
        {step === 'search' && (
          <AddFlowSearchStep itemType={itemType} onSelect={handleSearchSelect} onBack={handleBack} />
        )}
        {step === 'confirm' && (
          <AddFlowConfirmStep itemType={itemType} item={selectedItem} onConfirm={handleConfirm} onBack={handleBack} />
        )}
        {step === 'enhancements' && (
          <AddFlowEnhancementStep itemType={itemType} item={selectedItem} onConfirm={handleEnhancementsConfirm} onBack={handleBack} />
        )}
        {step === 'processing' && (
          <AddFlowProcessingStep itemType={itemType} item={selectedItem} onCreated={handleCreated} />
        )}
      </DialogContent>
    </Dialog>
  );
}