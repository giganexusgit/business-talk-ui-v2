module.exports = {
  apps: [
    {
      name: 'business-talk-ui',
      script: 'npm',
      args: 'start',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
    },
  ],
};
