const { prisma } = require("../config/db");

// In-memory store for productized services
const productizedServicesStore = [];

/**
 * Lists fixed-scope Productized Services.
 */
const listProductizedServices = async (category = null) => {
  if (productizedServicesStore.length === 0) {
    productizedServicesStore.push(
      {
        id: "serv-101",
        title: "Modern React & Tailwind Landing Page",
        freelancerName: "Ankit Kumar",
        freelancerId: "fl-ankit",
        category: "Web Development",
        ratingAvg: 4.9,
        tiers: {
          basic: { price: 15000, deliveryDays: 3, features: ["1 Page", "Responsive Layout"] },
          standard: { price: 35000, deliveryDays: 7, features: ["5 Pages", "Responsive Design", "Deployment", "2 Revisions"] },
          premium: { price: 65000, deliveryDays: 14, features: ["10 Pages", "Full Design System", "SEO Optimization", "Unlimited Revisions"] },
        },
      },
      {
        id: "serv-102",
        title: "AI RAG Pipeline & Vector DB Integration",
        freelancerName: "Rahul Sharma",
        freelancerId: "fl-rahul",
        category: "AI / ML",
        ratingAvg: 5.0,
        tiers: {
          basic: { price: 25000, deliveryDays: 5, features: ["LangChain Setup", "ChromaDB Integration"] },
          standard: { price: 50000, deliveryDays: 10, features: ["Custom Embedding Pipeline", "Pinecone DB", "FastAPI Service"] },
          premium: { price: 95000, deliveryDays: 20, features: ["Enterprise Multi-Tenant RAG", "Fine-Tuning", "24/7 Monitoring"] },
        },
      }
    );
  }

  if (category) {
    return productizedServicesStore.filter((s) => s.category.toLowerCase() === category.toLowerCase());
  }

  return productizedServicesStore;
};

/**
 * Buys a Productized Service tier directly.
 */
const buyProductizedService = async (serviceId, clientUserId, tierName = "standard") => {
  const service = productizedServicesStore.find((s) => s.id === serviceId) || productizedServicesStore[0];
  const selectedTier = service.tiers[tierName] || service.tiers.standard;

  const orderId = `order-serv-${Date.now()}`;
  return {
    orderId,
    serviceId: service.id,
    serviceTitle: service.title,
    sellerId: service.freelancerId,
    buyerUserId: clientUserId,
    tierSelected: tierName,
    price: selectedTier.price,
    deliveryDays: selectedTier.deliveryDays,
    status: "ESCROW_FUNDED",
    createdAt: new Date().toISOString(),
  };
};

module.exports = {
  listProductizedServices,
  buyProductizedService,
};
