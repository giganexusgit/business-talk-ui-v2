module.exports = {
  apps: [
    {
      name: 'business-talk-ui',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4001',
      instances: 'max',
      exec_mode: 'cluster',
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
