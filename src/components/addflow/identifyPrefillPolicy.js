export function applyIdentifyConfidencePolicy(itemType, payload = {}, identifyResult = null) {
  // Pipe-only pass for this improvement; other item types keep prior behavior.
  if (itemType !== 'pipe') return payload;

  const confidence = identifyResult?.confidence || 'low';
  if (confidence === 'high') {
    return {
      ...payload,
      _identifyConfidence: confidence,
    };
  }

  const base = {
    name: payload.name,
    maker: payload.maker,
    shape: payload.shape,
    photos: Array.isArray(payload.photos) ? payload.photos : [],
    stamping_photos: Array.isArray(payload.stamping_photos) ? payload.stamping_photos : [],
    notes: payload.notes,
    _identifyConfidence: confidence,
    _identifySuggestedValues: payload,
  };

  if (confidence === 'medium') {
    return {
      ...base,
      line_series: payload.line_series,
      shape_number: payload.shape_number,
      country_of_origin: payload.country_of_origin,
    };
  }

  return base;
}
