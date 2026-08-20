const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller.js");
const attachmentController = require("../controllers/attachment.controller.js");
const { protect } = require("../middleware/auth.middleware.js");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(protect);

// Attachments
router.post("/attachments/upload", upload.single("file"), attachmentController.uploadAttachment);
router.get("/attachments/:id/download", attachmentController.downloadAttachment);

// Conversations
router.post("/conversations/initiate", chatController.initiateConversation);
router.get("/conversations", chatController.listConversations);
router.get("/conversations/:id/messages", chatController.getMessages);
router.post("/conversations/:id/messages", chatController.sendMessage);
router.get("/conversations/:id/search", chatController.searchMessages);
router.get("/conversations/:id/export", chatController.exportConversation);
router.post("/conversations/:id/revisions", chatController.requestRevision);

// Messages Actions
router.put("/messages/:id", chatController.editMessage);
router.delete("/messages/:id", chatController.deleteMessage);
router.post("/messages/:id/reaction", chatController.toggleReaction);

// Moderation
router.get("/moderation/events", chatController.getModerationEvents);

module.exports = router;
