const { prisma } = require("../config/db");

// In-memory mentor bookings store
const mentorBookingsStore = {};

/**
 * Lists top verified FreelNova mentors.
 */
const listMentors = async () => {
  const mentors = await prisma.user.findMany({
    where: {
      role: "freelancer",
      isVerified: true,
      moderationStatus: "active",
    },
    select: {
      id: true,
      name: true,
      headline: true,
      skills: true,
      hourlyRate: true,
      ratingAvg: true,
      ratingCount: true,
      experienceYears: true,
    },
    take: 6,
  });

  return mentors.map((m) => ({
    id: m.id,
    name: m.name,
    headline: m.headline || "Senior Technical & Career Mentor",
    skills: m.skills,
    ratingAvg: m.ratingAvg || 4.9,
    experienceYears: m.experienceYears || 5,
    sessionPrice30Min: Math.round((m.hourlyRate || 800) * 0.6),
    sessionPrice60Min: m.hourlyRate || 800,
    categories: ["Technical Architecture", "Pricing Strategy", "Portfolio Review", "Client Negotiation"],
  }));
};

/**
 * Books a 30-min or 60-min consultation session with a mentor.
 */
const bookMentorSession = async (userId, payload) => {
  const { mentorId, durationMinutes = 30, topic, scheduledTime } = payload;

  if (!mentorId || !topic) {
    throw new Error("mentorId and topic are required");
  }

  const mentor = await prisma.user.findUnique({
    where: { id: mentorId },
    select: { name: true, email: true },
  });

  if (!mentor) {
    throw new Error("Mentor not found");
  }

  const bookingId = `book-${Date.now()}`;
  const booking = {
    id: bookingId,
    clientUserId: userId,
    mentorId,
    mentorName: mentor.name,
    durationMinutes: Number(durationMinutes),
    topic: String(topic).trim(),
    scheduledTime: scheduledTime || new Date(Date.now() + 86400000).toISOString(),
    status: "CONFIRMED_ESCROW_PAID",
    createdAt: new Date().toISOString(),
  };

  if (!mentorBookingsStore[userId]) {
    mentorBookingsStore[userId] = [];
  }
  mentorBookingsStore[userId].unshift(booking);

  return booking;
};

module.exports = {
  listMentors,
  bookMentorSession,
};
