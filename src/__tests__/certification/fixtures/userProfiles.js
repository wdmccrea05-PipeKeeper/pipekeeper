/**
 * Canonical user profile fixtures for Pairing Engine Certification.
 */

export const USER_PROFILES = {
  empty: {},

  aromaticPreference: {
    preferred_blend_types: ['Aromatic'],
    strength_preference: 'mild',
    smoke_duration_preference: 'medium',
    pipe_size_preference: 'medium',
  },

  englishPreference: {
    preferred_blend_types: ['English', 'Balkan'],
    strength_preference: 'full',
    smoke_duration_preference: 'long',
    pipe_size_preference: 'large',
  },

  virginiaPreference: {
    preferred_blend_types: ['Virginia', 'VaPer'],
    strength_preference: 'medium',
    smoke_duration_preference: 'medium',
    pipe_size_preference: 'medium',
  },
};
