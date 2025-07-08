#!/bin/bash

# Fix Docker Installation Script for Ubuntu EC2
# Usage: ./fix-docker.sh <ec2-ip> <key-file>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <ec2-public-ip> <path-to-key-file>"
    echo "Example: $0 54.165.206.10 Document-QA.pem"
    exit 1
fi

EC2_IP=$1
KEY_FILE=$2

echo "🔧 Fixing Docker installation on EC2..."

ssh -i "$KEY_FILE" ubuntu@$EC2_IP << 'EOF'
    # Remove any existing Docker installations
    sudo apt-get remove -y docker docker-engine docker.io containerd runc || true
    
    # Update package index
    sudo apt-get update
    
    # Install prerequisites
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up the repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index again
    sudo apt-get update
    
    # Install Docker Engine
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    echo "✅ Docker installation completed!"
    
    # Test Docker
    sudo docker --version
    docker-compose --version || echo "docker-compose not found, will use docker compose"
EOF

echo "🔧 Docker installation fixed!"
echo "📋 Next: SSH in and run 'newgrp docker' then start your containers" 