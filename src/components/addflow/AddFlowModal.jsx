import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AddFlowChoice from './AddFlowChoice';
import AddFlowQuickSearch from './AddFlowQuickSearch';
import AddFlowQuickConfirm from './AddFlowQuickConfirm';
import AddFlowManualBasic from './AddFlowManualBasic';
import AddFlowManualDetails from './AddFlowManualDetails';
import AddFlowManualImages from './AddFlowManualImages';

const TYPE_LABELS = { pipe: 'Pipe', blend: 'Blend', bottle: 'Bottle' };

export default function AddFlowModal({ open, onClose, onCreated, initialItemType }) {
  const [step, setStep] = useState('choice');
  const [itemType] = useState(initialItemType || 'blend');
  const [searchResult, setSearchResult] = useState(null);
  const [manualData, setManualData] = useState({});

  useEffect(() => {
    if (open) {
      setStep('choice');
      setSearchResult(null);
      setManualData({});
    }
  }, [open]);

  const close = () => onClose();
  const created = (record) => { onCreated?.(record); close(); };

  const goBack = () => {
    const map = {
      quickSearch: 'choice',
      quickConfirm: 'quickSearch',
      manualBasic: 'choice',
      manualDetails: 'manualBasic',
      manualImages: 'manualDetails',
    };
    const prev = map[step];
    if (prev) setStep(prev);
    else close();
  };

  const sharedProps = { itemType, onBack: goBack, onClose: close, typeLabel: TYPE_LABELS[itemType] };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent
        className="max-w-lg w-full p-0 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(34,23,15,0.99) 0%, rgba(20,13,8,1) 100%)',
          border: '1px solid rgba(180,140,75,0.24)',
          boxShadow: '0 28px 72px rgba(0,0,0,0.75)',
          borderRadius: '1.25rem',
        }}
      >
        <div className="overflow-y-auto" style={{ maxHeight: '90vh' }}>
          {step === 'choice' && (
            <AddFlowChoice
              {...sharedProps}
              onQuickAdd={() => setStep('quickSearch')}
              onManualAdd={() => setStep('manualBasic')}
            />
          )}

          {step === 'quickSearch' && (
            <AddFlowQuickSearch
              {...sharedProps}
              onSelect={(result) => { setSearchResult(result); setStep('quickConfirm'); }}
              onManual={() => setStep('manualBasic')}
            />
          )}

          {step === 'quickConfirm' && (
            <AddFlowQuickConfirm
              {...sharedProps}
              result={searchResult}
              onSearchAgain={() => setStep('quickSearch')}
              onManual={() => setStep('manualBasic')}
              onCreated={created}
            />
          )}

          {step === 'manualBasic' && (
            <AddFlowManualBasic
              {...sharedProps}
              data={manualData}
              onNext={(d) => { setManualData(prev => ({ ...prev, ...d })); setStep('manualDetails'); }}
            />
          )}

          {step === 'manualDetails' && (
            <AddFlowManualDetails
              {...sharedProps}
              data={manualData}
              onNext={(d) => { setManualData(prev => ({ ...prev, ...d })); setStep('manualImages'); }}
            />
          )}

          {step === 'manualImages' && (
            <AddFlowManualImages
              {...sharedProps}
              data={manualData}
              onCreated={created}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}