import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AddFlowChoice from './AddFlowChoice';
import AddFlowQuickSearch from './AddFlowQuickSearch';
import AddFlowQuickConfirm from './AddFlowQuickConfirm';
import AddFlowManualBasic from './AddFlowManualBasic';
import AddFlowManualDetails from './AddFlowManualDetails';
import AddFlowManualImages from './AddFlowManualImages';
import AddFlowBlendInventory from './AddFlowBlendInventory';

const TYPE_LABELS = { pipe: 'Pipe', blend: 'Blend', bottle: 'Bottle' };

export default function AddFlowModal({ open, onClose, onCreated, initialItemType }) {
  const navigate = useNavigate();
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
  const created = (record) => {
    onCreated?.(record);
    close();
    if (record?.id) {
      const detailPath = itemType === 'blend' ? 'TobaccoDetail' : itemType === 'pipe' ? 'PipeDetail' : 'BottleDetail';
      const paramName = itemType === 'blend' ? 'id' : 'id';
      navigate(`/${detailPath}?${paramName}=${encodeURIComponent(record.id)}`);
    }
  };

  const goBack = () => {
    const map = {
      quickSearch: 'choice',
      quickConfirm: 'quickSearch',
      blendInventoryQuick: 'quickConfirm',
      blendImagesQuick: 'blendInventoryQuick',
      blendInventoryManual: 'manualDetails',
      manualBasic: 'choice',
      manualDetails: 'manualBasic',
      manualImages: itemType === 'blend' ? 'blendInventoryManual' : 'manualDetails',
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
              onCreated={itemType === 'blend'
                ? (record) => { setManualData(prev => ({ ...prev, _quickRecord: record })); setStep('blendInventoryQuick'); }
                : created
              }
            />
          )}

          {step === 'blendInventoryQuick' && (
            <AddFlowBlendInventory
              {...sharedProps}
              stepLabel="Inventory — Step 2 of 3"
              data={manualData}
              onNext={(inv) => { setManualData(prev => ({ ...prev, ...inv })); setStep('blendImagesQuick'); }}
            />
          )}

          {step === 'blendImagesQuick' && (
            <AddFlowManualImages
              {...sharedProps}
              data={manualData}
              onCreated={async (record) => {
                const rec = manualData._quickRecord;
                if (rec) {
                  try {
                    const { base44 } = await import('@/api/base44Client');
                    await base44.entities.TobaccoBlend.update(rec.id, manualData);
                    created({ ...rec, ...manualData });
                  } catch { created(rec); }
                } else { close(); }
              }}
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
              onNext={(d) => { setManualData(prev => ({ ...prev, ...d })); setStep(itemType === 'blend' ? 'blendInventoryManual' : 'manualImages'); }}
            />
          )}

          {step === 'blendInventoryManual' && (
            <AddFlowBlendInventory
              {...sharedProps}
              stepLabel="Step 3 of 4"
              data={manualData}
              onNext={(inv) => { setManualData(prev => ({ ...prev, ...inv })); setStep('manualImages'); }}
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