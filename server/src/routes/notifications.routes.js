const express = require("express");
const notificationController = require("../controllers/notification.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, notificationController.listMyNotifications);
router.get("/recipients", protect, authorize("admin"), notificationController.searchRecipients);
router.patch("/read-all", protect, notificationController.markAllNotificationsAsRead);
router.patch("/:id/read", protect, notificationController.markNotificationAsRead);
router.post("/broadcast", protect, authorize("admin"), notificationController.broadcastAnnouncement);

module.exports = router;
