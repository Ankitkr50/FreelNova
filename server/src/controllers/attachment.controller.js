const { prisma } = require("../config/db");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const env = require("../config/env");

if (env.cloudinaryCloudName) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
}

const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".scr", ".ps1", ".sh", ".vbs", ".jar", ".dll", ".sys", ".msi", ".com", ".cpl", ".hta"
];

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
  "application/zip", "application/x-zip-compressed", "application/x-rar-compressed"
];

/**
 * Handle persistent chat attachment upload with strict file validation & guaranteed local storage fallback
 */
exports.uploadAttachment = async (req, res) => {
  try {
    const { conversationId, projectId } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, error: "No attachment file provided" });
    }

    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();

    // 1. Validate dangerous extensions
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: `Executable and script files (${ext}) are blocked for security protection.`
      });
    }

    // 2. Validate MIME type & file size (10 MB limit)
    const isAllowedMime = ALLOWED_MIME_TYPES.some(m => file.mimetype.toLowerCase().includes(m.split("/")[1]));
    if (!isAllowedMime && !ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `File type ${file.mimetype} is not supported.`
      });
    }

    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: "File size exceeds the 10 MB limit."
      });
    }

    const targetConvId = conversationId || `conv_${Date.now()}`;

    // 3. Ensure Conversation record exists in database and user is authorized to upload
    try {
      const { verifyChatUnlockStatus } = require("./chat.controller");

      const existingConv = await prisma.conversation.findUnique({
        where: { id: targetConvId }
      });

      if (!existingConv) {
        await prisma.conversation.create({
          data: {
            id: targetConvId,
            type: "PROJECT",
            participantIds: [userId],
            metadata: { createdForAttachment: true }
          }
        });
      } else {
        const authCheck = await verifyChatUnlockStatus(existingConv, userId, req.user.role);
        if (!authCheck.allowed) {
          return res.status(authCheck.statusCode || 403).json({
            success: false,
            code: authCheck.code || "CHAT_NOT_ALLOWED",
            error: authCheck.error
          });
        }
      }
    } catch (dbConvErr) {
      console.warn("Conversation lookup/upsert warning:", dbConvErr.message);
    }

    // 4. Save file to disk in uploads/chat/ directory
    const uploadsDir = path.join(__dirname, "../../uploads/chat");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    fs.writeFileSync(filePath, file.buffer);

    let storedUrl = `/uploads/chat/${uniqueFileName}`;

    // Optionally upload to Cloudinary if env configured (with 6s max timeout fallback)
    if (env.cloudinaryCloudName) {
      try {
        const uploadStream = () => new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "freelnova_chat_attachments", resource_type: "auto" },
            (err, result) => (err ? reject(err) : resolve(result.secure_url))
          );
          stream.end(file.buffer);
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Cloudinary timeout")), 6000)
        );
        storedUrl = await Promise.race([uploadStream(), timeoutPromise]);
      } catch (cErr) {
        console.warn("Cloudinary upload fallback to local URL:", cErr.message);
      }
    }

    // 5. Create ChatAttachment record in Prisma DB
    const attachment = await prisma.chatAttachment.create({
      data: {
        conversationId: targetConvId,
        projectId: projectId || null,
        senderId: userId,
        originalName: file.originalname,
        storedUrl,
        mimeType: file.mimetype,
        size: file.size,
        metadata: {
          extension: ext,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        attachmentId: attachment.id,
        id: attachment.id,
        url: attachment.storedUrl,
        downloadUrl: `/api/v1/chat/attachments/${attachment.id}/download`,
        fileName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size
      }
    });
  } catch (error) {
    console.error("Attachment upload failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to upload attachment file"
    });
  }
};

/**
 * Securely access/download a chat attachment with strict RBAC & conversation authorization
 */
exports.downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isUserAdmin = req.user.role === "admin";

    const attachment = await prisma.chatAttachment.findUnique({
      where: { id },
      include: {
        conversation: true,
        project: true
      }
    });

    if (!attachment) {
      return res.status(404).json({ success: false, error: "Attachment not found" });
    }

    // Authorization Check: Must be uploader, participant of conversation, project party, or admin
    let isAuthorized = isUserAdmin || attachment.uploadedById === userId;

    if (!isAuthorized && attachment.conversation) {
      isAuthorized = attachment.conversation.participantIds.includes(userId) || 
                     attachment.conversation.type === "ADMIN_SUPPORT";
    }

    if (!isAuthorized && attachment.project) {
      isAuthorized = attachment.project.recruiterId === userId || attachment.project.selectedFreelancer === userId;
    }

    if (!isAuthorized && !attachment.conversationId && !attachment.projectId) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: "Access denied to this file attachment" });
    }

    // Stream / Serve local file or redirect to remote URL
    const storedUrl = attachment.storedUrl;

    if (storedUrl.startsWith("/uploads/chat/")) {
      const fileName = path.basename(storedUrl);
      const filePath = path.join(__dirname, "../../uploads/chat", fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: "Attachment file not found on server storage" });
      }

      return res.download(filePath, attachment.originalName);
    }

    if (storedUrl.startsWith("http://") || storedUrl.startsWith("https://")) {
      return res.redirect(storedUrl);
    }

    return res.status(400).json({ success: false, error: "Invalid attachment storage URL" });
  } catch (error) {
    console.error("Download attachment error:", error);
    return res.status(500).json({ success: false, error: "Failed to download attachment" });
  }
};

