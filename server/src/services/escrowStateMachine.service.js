/**
 * Valid Escrow States:
 * CREATED → FUNDED → ACTIVE → DELIVERED → UNDER_REVIEW → APPROVED → RELEASED | DISPUTED | REFUNDED | CANCELLED
 */
const VALID_ESCROW_TRANSITIONS = {
  CREATED: ["FUNDED", "CANCELLED"],
  FUNDED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["DELIVERED", "DISPUTED", "CANCELLED"],
  DELIVERED: ["UNDER_REVIEW", "DISPUTED"],
  UNDER_REVIEW: ["APPROVED", "DISPUTED"],
  APPROVED: ["RELEASED"],
  RELEASED: [], // Terminal state
  DISPUTED: ["RELEASED", "REFUNDED"],
  REFUNDED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Validates and transitions an Escrow state strictly.
 */
const transitionEscrowState = (currentState, targetState) => {
  const allowed = VALID_ESCROW_TRANSITIONS[currentState] || [];

  if (!allowed.includes(targetState)) {
    throw new Error(`Invalid Escrow State Transition from ${currentState} to ${targetState}. Allowed: [${allowed.join(", ")}]`);
  }

  return targetState;
};

module.exports = {
  VALID_ESCROW_TRANSITIONS,
  transitionEscrowState,
};
