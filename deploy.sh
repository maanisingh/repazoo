#!/bin/bash

echo "🚀 Deploying RepAZoo to production..."

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# Pull latest images
echo "Pulling latest Docker images..."
docker-compose pull

# Build the application
echo "Building application..."
docker-compose build --no-cache

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check if services are running
echo "Checking service status..."
docker-compose ps

# Test the deployments
echo "Testing deployments..."
echo "🌐 Marketing site should be available at: https://cfy.repazoo.com"
echo "📊 Dashboard should be available at: https://dash.repazoo.com"

echo "✅ Deployment completed!"
echo ""
echo "⚠️  IMPORTANT: Make sure to:"
echo "   1. Point cfy.repazoo.com and dash.repazoo.com DNS records to this server"
echo "   2. Replace self-signed certificates with proper SSL certificates"
echo "   3. Update environment variables for production"
echo "   4. Configure firewall to allow ports 80 and 443"