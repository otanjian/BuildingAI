const clientDevPort = Number(process.env.CLIENT_DEV_PORT || 4091);
const buildingaiApiUrl = process.env.BUILDINGAI_API_URL || "http://127.0.0.1:4090";
const buildingaiOpencodeInternalKey =
  process.env.BUILDINGAI_OPENCODE_INTERNAL_KEY || "buildingai-local-opencode";

module.exports = {
  apps: [
    {
      name: "buildingai-api",
      script: ".run/start-api.js",
      cwd: "./",
      env: {
        NO_PROXY: "localhost,127.0.0.1,::1",
        no_proxy: "localhost,127.0.0.1,::1",
        BUILDINGAI_API_URL: buildingaiApiUrl,
        BUILDINGAI_OPENCODE_INTERNAL_KEY: buildingaiOpencodeInternalKey,
      },
      log_file: ".run/dev.log",
      out_file: ".run/dev.log",
      error_file: ".run/dev.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 5,
      min_uptime: "10s",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      kill_timeout: 5000,
      listen_timeout: 30000,
      wait_ready: false,
    },
    {
      name: "buildingai-web",
      script: ".run/start-web.js",
      cwd: "./",
      env: {
        CLIENT_DEV_PORT: clientDevPort,
        NO_PROXY: "localhost,127.0.0.1,::1",
        no_proxy: "localhost,127.0.0.1,::1",
      },
      log_file: ".run/dev.log",
      out_file: ".run/dev.log",
      error_file: ".run/dev.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 5,
      min_uptime: "10s",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      kill_timeout: 5000,
      listen_timeout: 30000,
      wait_ready: false,
    },
  ],
};
