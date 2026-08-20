/**
 * External Workplace Connectors: Slack slash commands, Teams notifications, Google Workspace.
 */
const handleSlackSlashCommand = async (command, text) => {
  const q = String(text || "").toLowerCase();

  let responseText = "";
  if (q.includes("status")) {
    responseText = "🚀 FreelNova Slack Status: 3 active projects in progress. 1 milestone pending approval.";
  } else if (q.includes("search") || q.includes("talent")) {
    responseText = "🔍 FreelNova Talent Match: Found 4 verified React/Node.js candidates ready for hiring.";
  } else {
    responseText = "⚡ FreelNova Slash Commands: /freelnova status | /freelnova talent search | /freelnova approvals";
  }

  return {
    response_type: "ephemeral",
    text: responseText,
  };
};

module.exports = {
  handleSlackSlashCommand,
};
