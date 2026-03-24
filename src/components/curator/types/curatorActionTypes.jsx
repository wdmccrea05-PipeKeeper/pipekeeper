export const CURATOR_ACTIONS = {
  OPTIMIZE_COLLECTION: "optimize_collection",
  RECOMMEND_SPECIALIZATIONS: "recommend_specializations",
  UPDATE_PIPE_MEASUREMENTS: "update_pipe_measurements",
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
};

export const ACTION_RUN_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  SUCCESS: "success",
  EMPTY: "empty",
  ERROR: "error",
  TIMEOUT: "timeout",
};