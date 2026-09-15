# Deployment Guide

This document provides instructions for deploying the Businesstalk24 Platform UI to various platforms.

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Configure environment variables in .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# Run development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Docker Deployment

### Build Docker Image
```bash
docker build -t businesstalk24:latest .
```

### Run with Docker
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000/api \
  -e NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws \
  businesstalk24:latest
```

### Using Docker Compose
```bash
docker-compose up -d
```

## Vercel Deployment (Recommended)

### Prerequisites
- Vercel account
- Git repository (GitHub, GitLab, or Bitbucket)

### Step 1: Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your repository

### Step 2: Configure Environment Variables
1. In Vercel dashboard, go to Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL
   - `NEXT_PUBLIC_WS_URL`: Your WebSocket URL

### Step 3: Deploy
1. Click "Deploy"
2. Vercel will automatically build and deploy
3. Your app will be live at `your-project.vercel.app`

### Auto-Deployment
Every push to your main branch will trigger automatic deployment.

## AWS Deployment

### Option 1: Using Amplify

1. Connect your GitHub repository to AWS Amplify
2. Choose Next.js as the framework
3. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://api.example.com
   NEXT_PUBLIC_WS_URL=wss://api.example.com/ws
   ```
4. Deploy

### Option 2: Using EC2

1. Launch an EC2 instance (Ubuntu 22.04)
2. SSH into the instance
3. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Clone the repository and build:
   ```bash
   git clone <your-repo>
   cd business-talk-UI
   npm install
   npm run build
   ```
5. Use PM2 to manage the process:
   ```bash
   npm install -g pm2
   pm2 start npm --name "businesstalk24" -- start
   pm2 startup
   pm2 save
   ```
6. Set up Nginx as reverse proxy:
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;

     location / {
       proxy_pass http://localhost:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

## Google Cloud Platform (GCP)

### Using Cloud Run

1. Build and push Docker image to Google Container Registry:
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/businesstalk24
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy businesstalk24 \
     --image gcr.io/PROJECT_ID/businesstalk24 \
     --platform managed \
     --region us-central1 \
     --set-env-vars NEXT_PUBLIC_API_URL=https://api.example.com
   ```

## DigitalOcean

### Using App Platform

1. Connect your GitHub repository to DigitalOcean App Platform
2. Configure the app:
   - Environment: Docker
   - Build: `npm run build` / `npm start`
3. Add environment variables
4. Deploy

## Performance Optimization

### Build Optimization
```bash
npm run build
npm run analyze  # Analyze bundle size
```

### Caching
- Enable Redis caching for API responses
- Configure CDN for static assets
- Use next/image for automatic image optimization

### Monitoring
- Set up error tracking with Sentry
- Monitor performance with Vercel Analytics
- Log WebSocket events and API calls

## Security Checklist

- [ ] Set secure environment variables
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Set security headers
- [ ] Regular dependency updates
- [ ] Keep Node.js updated
- [ ] Use environment-specific secrets

## Continuous Integration/Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: vercel --prod --token $VERCEL_TOKEN
```

## Rolling Back

### Vercel
- Go to Deployments
- Click the previous deployment
- Click "Promote to Production"

### Docker
```bash
docker pull businesstalk24:previous-tag
docker run -p 3000:3000 businesstalk24:previous-tag
```

### AWS
- Use CloudFormation or Amplify to rollback

## Monitoring & Logging

### Application Logs
- Monitor in real-time: `npm run dev`
- Check logs in production: See platform-specific logs

### Error Tracking
```bash
# Use Sentry for production monitoring
npm install @sentry/nextjs
```

### Performance Monitoring
- Vercel Analytics
- Google Lighthouse
- WebVitals

## Support

For deployment issues, contact DevOps team or refer to platform-specific documentation.
