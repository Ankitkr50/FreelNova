/**
 * PM2 Ecosystem Config — FreelNova Production
 *
 * Usage:
 *   npm install -g pm2
 *   cd server
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save   (persist across reboots)
 *   pm2 startup (generate OS startup script)
 *
 * Cluster mode is handled INSIDE server.js via Node's built-in `cluster`
 * module, so PM2 runs in `fork` mode here (one PM2 process, N Node workers).
 * This avoids double-clustering.
 *
 * Alternatively, set `exec_mode: "cluster"` and `instances: "max"` in PM2
 * and remove the cluster logic from server.js — either approach works.
 */
module.exports = {
  apps: [
    {
      name: "freelnova-api",
      script: "src/server.js",
      cwd: __dirname,

      // Single PM2 instance; internal cluster handles multi-core.
      instances: 1,
      exec_mode: "fork",

      // Environment variables for production.
      env_production: {
        NODE_ENV: "production",
      },

      // Restart if process exceeds 512 MB RSS (memory leak guard).
      max_memory_restart: "512M",

      // Exponential backoff on crash restarts — prevents restart storms.
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 1000,

      // Wait 5 seconds for the server to be ready before marking as "online".
      wait_ready: true,
      listen_timeout: 10_000,

      // Graceful stop: send SIGINT first, allow 10s for drain, then SIGKILL.
      kill_timeout: 10_000,
      shutdown_with_message: false,

      // Logs.
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Watch is disabled in production — use CI/CD deploys instead.
      watch: false,
    },
  ],
};
