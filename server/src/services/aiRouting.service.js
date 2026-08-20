/**
 * AI Model Routing Abstraction: Selects cost-effective AI model depending on task complexity.
 */
const routeAIModelRequest = async (taskType, promptText) => {
  let selectedModel = "gemini-2.5-flash"; // Default fast low-cost model
  let modelTier = "FAST_TIER";

  if (taskType === "DISPUTE_EVIDENCE_SUMMARY" || taskType === "COMPLEX_PROJECT_AUTOPILOT") {
    selectedModel = "gemini-2.5-pro";
    modelTier = "HIGH_CAPABILITY_TIER";
  }

  return {
    taskType,
    selectedModel,
    modelTier,
    estimatedCostPer1kTokensUsd: selectedModel.includes("pro") ? 0.002 : 0.0002,
  };
};

module.exports = {
  routeAIModelRequest,
};
