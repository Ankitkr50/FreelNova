const { WebSocketServer } = require("ws");
const logger = require("../utils/logger");

// Role-based FAQ Questions and Answers mapping
const FREELANCER_FAQ = {
  options: [
    { id: "faq_free_apply", text: "How do I apply for a project?" },
    { id: "faq_free_pay", text: "How do I get paid?" },
    { id: "faq_free_pro", text: "What is FreelNova Pro?" },
    { id: "faq_team", text: "Connect with FreelNova Team" }
  ],
  answers: {
    faq_free_apply: "To apply for a project, go to the 'Find Work' page, select a project that matches your skills, and click the 'Apply Now' button. You can track all your applications from your Dashboard.",
    faq_free_pay: "Once you complete the project milestones and the recruiter approves the work, the escrowed funds are released directly to your wallet balance. You can then withdraw them.",
    faq_free_pro: "FreelNova Pro is our premium plan offering highlighted applications to recruiters, lower service fees, and advanced search features to find top-paying work.",
    faq_team: "You can reach the FreelNova support and operations team directly by emailing support@fn.freelnova.com. Also, feel free to visit our portal at fn.freelnova.com for more info."
  }
};

const RECRUITER_FAQ = {
  options: [
    { id: "faq_rec_post", text: "How do I post a project?" },
    { id: "faq_rec_escrow", text: "How does escrow work?" },
    { id: "faq_rec_select", text: "How do I select a freelancer?" },
    { id: "faq_team", text: "Connect with FreelNova Team" }
  ],
  answers: {
    faq_rec_post: "To post a project, click on 'Post Project' in your dashboard navigation, fill in the requirements, title, scope, and budget, and submit it for freelancer bidding.",
    faq_rec_escrow: "When hiring a freelancer, you deposit the project funds into our secure escrow vault. The funds are held safely and are only released to the freelancer after you review and approve their work.",
    faq_rec_select: "Navigate to your posted projects list, select the project to view all bids, review freelancer profiles/resumes, and click 'Select Freelancer' to start the contract.",
    faq_team: "You can reach the FreelNova support and operations team directly by emailing support@fn.freelnova.com. Also, feel free to visit our portal at fn.freelnova.com for more info."
  }
};

function setupChatSupport(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade event manually to parse URL query params
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

    if (pathname === "/api/support-chat") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws, request) => {
    const urlObj = new URL(request.url, `http://${request.headers.host}`);
    const userRole = urlObj.searchParams.get("role") || "freelancer"; // Default to freelancer

    logger.info("support_chat_connected", { clientIp: ws._socket.remoteAddress, role: userRole });

    // Select FAQ content based on user role
    const activeFAQ = userRole === "recruiter" ? RECRUITER_FAQ : FREELANCER_FAQ;

    // Send initial greeting and options
    const greeting = {
      type: "welcome",
      sender: "bot",
      text: `Hello! Welcome to FreelNova Support. How can we help you today as a ${userRole === "recruiter" ? "Recruiter" : "Freelancer"}?`,
      options: activeFAQ.options,
      timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(greeting));

    ws.on("message", (messageData) => {
      try {
        const payload = JSON.parse(messageData);
        const userText = payload.text || "";

        if (payload.type === "option" && payload.optionId) {
          const answer = activeFAQ.answers[payload.optionId];
          if (answer) {
            // Echo the question as a user message
            const selectedOption = activeFAQ.options.find(opt => opt.id === payload.optionId);
            const userMsgEcho = {
              type: "message",
              sender: "user",
              text: selectedOption ? selectedOption.text : "Selected FAQ option",
              timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(userMsgEcho));

            // Send the bot answer
            setTimeout(() => {
              const botReply = {
                type: "message",
                sender: "bot",
                text: answer,
                options: activeFAQ.options,
                timestamp: new Date().toISOString()
              };
              ws.send(JSON.stringify(botReply));
            }, 500);
          }
        } else if (payload.type === "message") {
          // Echo user custom message back
          const userMsgEcho = {
            type: "message",
            sender: "user",
            text: userText,
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(userMsgEcho));

          // Analyze custom message keywords
          setTimeout(() => {
            const query = userText.toLowerCase();
            let botText = "";

            if (
              query.includes("mail") ||
              query.includes("email") ||
              query.includes("contact") ||
              query.includes("team") ||
              query.includes("connect") ||
              query.includes("reach") ||
              query.includes("support") ||
              query.includes("fn.freelnova") ||
              query.includes("help")
            ) {
              botText = "To connect with the FreelNova team directly, you can email us at support@fn.freelnova.com or visit our main website at fn.freelnova.com.";
            } else {
              botText = `Thank you for your message! For direct assistance, you can mail our support desk at support@fn.freelnova.com. Alternatively, feel free to use the quick options below for common ${userRole} questions.`;
            }

            const botReply = {
              type: "message",
              sender: "bot",
              text: botText,
              options: activeFAQ.options,
              timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(botReply));
          }, 600);
        }
      } catch (err) {
        logger.error("support_chat_message_error", { message: err.message });
      }
    });

    ws.on("close", () => {
      logger.info("support_chat_disconnected");
    });
  });

  return wss;
}

module.exports = { setupChatSupport };
