import http from "./http.js";

export const growthApi = {
  getReputation: async (userId) => {
    const url = userId ? `/growth/reputation/${userId}` : "/growth/reputation";
    const response = await http.get(url);
    return response.data.data;
  },

  getReferralInfo: async () => {
    const response = await http.get("/growth/referrals");
    return response.data.data;
  },

  getDiscoveryFeed: async (params) => {
    const response = await http.get("/growth/feed", { params });
    return response.data.data;
  },

  getInstantHire: async (params) => {
    const response = await http.get("/growth/instant-hire", { params });
    return response.data.data;
  },

  orchestrateLaunchpad: async (payload) => {
    const response = await http.post("/growth/launchpad/orchestrate", payload);
    return response.data.data;
  },

  getRewardBalance: async () => {
    const response = await http.get("/growth/rewards");
    return response.data.data;
  },

  claimReward: async (payload) => {
    const response = await http.post("/growth/rewards/claim", payload);
    return response.data;
  },

  getShowcase: async (username) => {
    const url = username ? `/growth/showcase/${username}` : "/growth/showcase";
    const response = await http.get(url);
    return response.data.data;
  },

  getCommunity: async (params) => {
    const response = await http.get("/growth/community", { params });
    return response.data.data;
  },

  createCommunityPost: async (payload) => {
    const response = await http.post("/growth/community", payload);
    return response.data;
  },

  getBusinessToolkit: async () => {
    const response = await http.get("/growth/business-toolkit");
    return response.data.data;
  },

  getAchievements: async () => {
    const response = await http.get("/growth/achievements");
    return response.data.data;
  },

  getGrowthDashboard: async () => {
    const response = await http.get("/growth/dashboard");
    return response.data.data;
  },
};
