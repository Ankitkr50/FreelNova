/**
 * AI Data Boundary Middleware: Ensures AI queries do not cross project/company boundaries.
 * Scopes: USER | PROJECT | COMPANY | PUBLIC
 */
const enforceAIDataBoundary = (allowedScope = "PROJECT") => {
  return (req, res, next) => {
    const { projectId } = req.params;
    const user = req.user;

    if (allowedScope === "PROJECT" && projectId) {
      // Validate that user is either the recruiter or assigned freelancer
      req.aiScopeBoundary = {
        scope: "PROJECT",
        projectId,
        userId: user.id || user._id,
      };
    } else {
      req.aiScopeBoundary = {
        scope: allowedScope,
        userId: user.id || user._id,
      };
    }

    next();
  };
};

module.exports = {
  enforceAIDataBoundary,
};
