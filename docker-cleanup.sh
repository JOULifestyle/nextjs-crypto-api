#!/bin/bash

# Docker cleanup script for NestJS Crypto API

echo "🧹 Cleaning up Docker containers and images..."

# Stop and remove containers
docker-compose down

# Remove volumes
docker-compose down -v

# Remove unused images
docker image prune -f

# Remove unused volumes
docker volume prune -f

# Remove stopped containers
docker container prune -f

echo "Docker cleanup completed!"
echo ""
echo "To start fresh:"
echo "  docker-compose up --build"