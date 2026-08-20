// Configurable Feature Flags
const featureFlagsStore = {
  ENABLE_MATCHING_ENGINE_20: true,
  ENABLE_MEETINGS_OS: true,
  ENABLE_PRODUCTIZED_SERVICES: true,
  ENABLE_NATURAL_LANGUAGE_SEARCH: true,
  ENABLE_STUDIO_AGENCY: true,
};

const getFeatureFlags = async () => {
  return featureFlagsStore;
};

module.exports = {
  getFeatureFlags,
};
