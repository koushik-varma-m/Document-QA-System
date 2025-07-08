#!/bin/bash

# Start Containers Script
# Usage: ./start-containers.sh <ec2-ip> <key-file>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <ec2-public-ip> <path-to-key-file>"
    echo "Example: $0 54.165.206.10 Document-QA.pem"
    exit 1
fi

EC2_IP=$1
KEY_FILE=$2

echo "🚀 Starting containers on EC2..."

ssh -i "$KEY_FILE" ubuntu@$EC2_IP << 'EOF'
    cd ~/document-qa-system
    
    # Apply docker group membership
    newgrp docker
    
    # Build and start containers
    docker compose up --build -d
    
    echo "✅ Containers started!"
    echo "📊 Container status:"
    docker ps
    
    echo "🌐 Your backend is available at: http://54.165.206.10:8000"
    echo "📚 API docs at: http://54.165.206.10:8000/docs"
EOF

echo "🎉 Containers started successfully!"
echo "🌐 Backend URL: http://$EC2_IP:8000"
echo "📚 API Docs: http://$EC2_IP:8000/docs" 