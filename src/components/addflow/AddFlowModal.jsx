import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AddFlowChoice from './AddFlowChoice';
import AddFlowQuickSearch from './AddFlowQuickSearch';
import AddFlowQuickConfirm from './AddFlowQuickConfirm';
import AddFlowManualBasic from './AddFlowManualBasic';
import AddFlowManualDetails from './AddFlowManualDetails';
import AddFlowManualImages from './AddFlowManualImages';
import AddFlowIdentify from './AddFlowIdentify';
import InventoryStep from '@/components/inventory/InventoryStep';
import { buildQuickAddPayload, buildValuationSeedData } from '@/components/identify/identifyEngine';

const TYPE_LABELS = {
  pipe: 'Pipe',
  blend: 'Blend',
  bottle: 'Bottle',
  cigar: 'Cigar',
};

function getInventoryStepName(itemType, mode) {
  if (itemType === 'blend') return mode === 'quick' ? 'inventoryQuick' : 'inventoryManual';
  if (itemType === 'bottle') return mode === 'quick' ? 'inventoryQuick' : 'inventoryManual';
  if (itemType === 'pipe') return mode === 'manual' ? 'inventoryManual' : null;
  return null;
}

export default function AddFlowModal({ open, onClose, onCreated, initialItemType }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('choice');
  const [itemType, setItemType] = useState(initialItemType || 'blend');
  const [searchResult, setSearchResult] = useState(null);
  const [wizardData, setWizardData] = useState({});

  useEffect(() => {
    if (!open) return;
    setItemType(initialItemType || 'blend');
    setStep('choice');
    setSearchResult(null);
    setWizardData({});
  }, [open, initialItemType]);

  const sharedProps = {
    itemType,
    typeLabel: TYPE_LABELS[itemType],
    onClose,
  };

  const close = () => onClose?.();

  const goToRecord = (record) => {
    onCreated?.(record);
    close();

    if (!record?.id) return;
    const route =
      itemType === 'blend'
        ? '/TobaccoDetail'
        : itemType === 'pipe'
          ? '/PipeDetail'
          : itemType === 'cigar'
            ? '/CigarDetail'
            : '/BottleDetail';

    navigate(`${route}?id=${encodeURIComponent(record.id)}`);
  };

  const goBack = () => {
    const previous = {
      quickSearch: 'choice',
      quickConfirm: 'quickSearch',
      identify: 'choice',
      identifyConfirm: 'identify',
      inventoryQuick: 'quickConfirm',
      manualBasic: 'choice',
      manualDetails: 'manualBasic',
      inventoryManual: 'manualDetails',
      manualImages: (itemType === 'blend' || itemType === 'bottle' || itemType === 'pipe') ? 'inventoryManual' : 'manualDetails',
      imagesQuick: itemType === 'blend' || itemType === 'bottle' ? 'inventoryQuick' : 'quickConfirm',
    };

    const next = previous[step];
    if (next) setStep(next);
    else close();
  };

  const saveStepData = (patch) => {
    setWizardData((prev) => ({ ...prev, ...patch }));
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent
        className="max-w-lg w-full p-0 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(34,23,15,0.99) 0%, rgba(20,13,8,1) 100%)',
          border: '1px solid rgba(180,140,75,0.24)',
          boxShadow: '0 28px 72px rgba(0,0,0,0.75)',
          borderRadius: '1.25rem',
          maxHeight: 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="overflow-y-auto flex-1"
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {step === 'choice' && (
            <AddFlowChoice
              {...sharedProps}
              onQuickAdd={() => setStep('quickSearch')}
              onManualAdd={() => setStep('manualBasic')}
              onScanUPC={() => { setStep('identify'); saveStepData({ _identifyInitialMode: 'upc' }); }}
              onPhotoIdentify={() => { setStep('identify'); saveStepData({ _identifyInitialMode: 'photo' }); }}
            />
          )}

          {step === 'quickSearch' && (
            <AddFlowQuickSearch
              {...sharedProps}
              onBack={goBack}
              onSelect={(result) => {
                setSearchResult(result);
                setStep('quickConfirm');
              }}
              onManual={() => setStep('manualBasic')}
            />
          )}

          {step === 'identify' && (
            <AddFlowIdentify
              {...sharedProps}
              initialMode={wizardData._identifyInitialMode || 'selector'}
              onBack={goBack}
              onManual={() => setStep('manualBasic')}
              onSelected={(candidate, identifyResult) => {
                const payload = buildQuickAddPayload(candidate, itemType);
                const valuationSeed = buildValuationSeedData(candidate, itemType);
                setSearchResult({ ...payload, ...valuationSeed, _fromIdentify: true });
                saveStepData({ ...payload, ...valuationSeed, _identifyResult: identifyResult });
                setStep('identifyConfirm');
              }}
            />
          )}

          {step === 'identifyConfirm' && (
            <AddFlowQuickConfirm
              {...sharedProps}
              onBack={goBack}
              result={searchResult}
              onSearchAgain={() => setStep('identify')}
              onManual={() => setStep('manualBasic')}
              onCreated={(record) => {
                const nextInventory = getInventoryStepName(itemType, 'quick');
                if (!nextInventory) {
                  goToRecord(record);
                  return;
                }
                saveStepData({
                  _quickRecord: { id: record.id, name: record.name },
                  ...searchResult,
                });
                setStep(nextInventory);
              }}
            />
          )}

          {step === 'quickConfirm' && (
            <AddFlowQuickConfirm
              {...sharedProps}
              onBack={goBack}
              result={searchResult}
              onSearchAgain={() => setStep('quickSearch')}
              onManual={() => setStep('manualBasic')}
              onCreated={(record) => {
                const nextInventory = getInventoryStepName(itemType, 'quick');
                if (!nextInventory) {
                  goToRecord(record);
                  return;
                }

                saveStepData({
                  _quickRecord: { id: record.id, name: record.name },
                  name: record.name || searchResult?.name,
                  manufacturer: record.manufacturer || searchResult?.manufacturer,
                  maker: record.maker || searchResult?.maker,
                  distillery: record.distillery || searchResult?.distillery,
                  blend_type: searchResult?.blend_type,
                  cut: searchResult?.cut,
                  strength: searchResult?.strength,
                  flavor_notes: searchResult?.flavor_notes,
                  shape: searchResult?.shape,
                  bowl_material: searchResult?.bowl_material,
                  type: searchResult?.whiskey_type,
                  age: searchResult?.age,
                  abv: searchResult?.abv,
                });

                setStep(nextInventory);
              }}
            />
          )}

          {step === 'manualBasic' && (
            <AddFlowManualBasic
              {...sharedProps}
              onBack={goBack}
              onClose={close}
              data={wizardData}
              onNext={(data) => {
                saveStepData(data);
                setStep('manualDetails');
              }}
            />
          )}

          {step === 'manualDetails' && (
            <AddFlowManualDetails
              {...sharedProps}
              onBack={goBack}
              onClose={close}
              data={wizardData}
              onNext={(data) => {
                saveStepData(data);
                const nextInventory = getInventoryStepName(itemType, 'manual');
                setStep(nextInventory || 'manualImages');
              }}
            />
          )}

          {step === 'inventoryQuick' && (
            <InventoryStep
              moduleType={itemType}
              stepLabel="Inventory — Step 3 of 4"
              data={wizardData}
              onBack={goBack}
              onNext={(inventoryData) => {
                saveStepData(inventoryData);
                setStep(itemType === 'pipe' ? 'manualImages' : 'imagesQuick');
              }}
            />
          )}

          {step === 'inventoryManual' && (
            <InventoryStep
              moduleType={itemType}
              stepLabel={itemType === 'pipe' ? 'Ownership — Step 3 of 4' : 'Inventory — Step 3 of 4'}
              data={wizardData}
              onBack={goBack}
              onNext={(inventoryData) => {
                saveStepData(inventoryData);
                setStep('manualImages');
              }}
            />
          )}

          {step === 'imagesQuick' && (
            <AddFlowManualImages
              {...sharedProps}
              data={wizardData}
              onBack={goBack}
              onCreated={goToRecord}
            />
          )}

          {step === 'manualImages' && (
            <AddFlowManualImages
              {...sharedProps}
              data={wizardData}
              onBack={goBack}
              onCreated={goToRecord}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}