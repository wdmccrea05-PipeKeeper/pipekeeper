// Measurement conversion utilities and context

import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useMutation } from '@tanstack/react-query';

// Conversion constants
const MM_TO_INCH = 1 / 25.4;
const GRAM_TO_OZ = 1 / 28.35;

// Context for measurement preference
const MeasurementContext = createContext({
  useImperial: false,
  setUseImperial: () => {},
  convertLength: (mm) => mm,
  convertWeight: (g) => g,
  getLengthUnit: () => 'mm',
  getWeightUnit: () => 'g',
  formatLength: (mm) => '',
  formatWeight: (g) => '',
});

export function MeasurementProvider({ children }) {
  const { user } = useCurrentUser();
  const [useImperial, setUseImperialState] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preference from UserProfile on mount
  useEffect(() => {
    if (!user?.email || isInitialized) return;

    (async () => {
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
        const profile = profiles?.[0];
        if (profile?.measurement_preference) {
          setUseImperialState(profile.measurement_preference === 'imperial');
        }
        setIsInitialized(true);
      } catch (err) {
        console.warn('Could not load measurement preference:', err);
        setIsInitialized(true);
      }
    })();
  }, [user?.email, isInitialized]);

  const updatePreferenceMutation = useMutation({
    mutationFn: async (preference) => {
      if (!user?.email) return;
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      const profile = profiles?.[0];
      
      if (profile) {
        await base44.entities.UserProfile.update(profile.id, {
          measurement_preference: preference
        });
      } else {
        await base44.entities.UserProfile.create({
          user_email: user.email,
          measurement_preference: preference
        });
      }
    }
  });

  const setUseImperial = (value) => {
    setUseImperialState(value);
    updatePreferenceMutation.mutate(value ? 'imperial' : 'metric');
  };

  const convertLength = (mm) => {
    if (!mm || isNaN(mm)) return null;
    return useImperial ? mm * MM_TO_INCH : mm;
  };

  const convertWeight = (grams) => {
    if (!grams || isNaN(grams)) return null;
    return useImperial ? grams * GRAM_TO_OZ : grams;
  };

  const getLengthUnit = () => useImperial ? 'in' : 'mm';
  const getWeightUnit = () => useImperial ? 'oz' : 'g';

  const formatLength = (mm) => {
    const converted = convertLength(mm);
    if (converted === null) return '';
    return `${Math.round(converted * 100) / 100} ${getLengthUnit()}`;
  };

  const formatWeight = (grams) => {
    const converted = convertWeight(grams);
    if (converted === null) return '';
    return `${Math.round(converted * 100) / 100} ${getWeightUnit()}`;
  };

  return (
    <MeasurementContext.Provider
      value={{
        useImperial,
        setUseImperial,
        convertLength,
        convertWeight,
        getLengthUnit,
        getWeightUnit,
        formatLength,
        formatWeight,
        isInitialized,
      }}
    >
      {children}
    </MeasurementContext.Provider>
  );
}

export function useMeasurement() {
  return useContext(MeasurementContext);
}

// Helper functions for converting user input back to metric (for storage)
export function imperialToMetric(value, type) {
  if (!value || isNaN(value)) return null;
  if (type === 'length') return value * 25.4; // inches to mm
  if (type === 'weight') return value * 28.35; // oz to grams
  return value;
}