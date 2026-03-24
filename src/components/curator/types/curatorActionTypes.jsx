export const CURATOR_ACTIONS = {
  OPTIMIZE_COLLECTION: "optimize_collection",
  OPTIMIZE_WHISKEY_COLLECTION: "optimize_whiskey_collection",
  RECOMMEND_SPECIALIZATIONS: "recommend_specializations",
  UPDATE_PIPE_MEASUREMENTS: "update_pipe_measurements",
  UPDATE_BOTTLE_DATA: "update_bottle_data",
  RECLASSIFY_TOBACCO_BLENDS: "reclassify_tobacco_blends",
  PAIRING_RECOMMENDATION: "pairing_recommendation",
  SESSION_BUILDER: "session_builder",
};

export const CURATOR_ITEM_TYPES = {
  SPECIALIZATION: "specialization",
  RECLASSIFICATION: "reclassification",
  MEASUREMENT_UPDATE: "measurement_update",
  ROTATION_OPTIMIZATION: "rotation_optimization",
  REDUNDANCY_FLAG: "redundancy_flag",
  METADATA_UPDATE: "metadata_update",
  BOTTLE_DATA_UPDATE: "bottle_data_update",
  VALUATION_UPDATE: "valuation_update",
  PAIRING_RECOMMENDATION: "pairing_recommendation",
  SESSION_BUILDER: "session_builder",
};

export const ACTION_RUN_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  SUCCESS: "success",
  EMPTY: "empty",
  ERROR: "error",
  TIMEOUT: "timeout",
};