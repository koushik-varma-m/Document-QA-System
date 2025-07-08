#!/bin/bash

# EC2 Deployment Script for Document QA System
# Usage: ./deploy-ec2.sh <ec2-ip> <key-file>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <ec2-public-ip> <path-to-key-file>"
    echo "Example: $0 34.230.45.125 ~/.ssh/my-key.pem"
    exit 1
fi

EC2_IP=$1
KEY_FILE=$2
REMOTE_USER="ubuntu"

echo "🚀 Starting deployment to EC2..."
echo "IP: $EC2_IP"
echo "Key: $KEY_FILE"

# Step 1: Test SSH connection
echo "📡 Testing SSH connection..."
ssh -i "$KEY_FILE" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$REMOTE_USER@$EC2_IP" "echo 'SSH connection successful'"

if [ $? -ne 0 ]; then
    echo "❌ SSH connection failed. Check your IP and key file."
    exit 1
fi

# Step 2: Install Docker on EC2 (if not already installed)
echo "🐳 Installing Docker on EC2..."
ssh -i "$KEY_FILE" "$REMOTE_USER@$EC2_IP" << 'EOF'
    # Update system
    sudo apt-get update -y
    sudo apt-get upgrade -y
    
    # Install prerequisites
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker’s official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up the Docker repository
    echo \ 
      "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt-get update -y
    
    # Install Docker Engine and Docker Compose
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    # Enable and start Docker
    sudo systemctl enable docker
    sudo systemctl start docker
    
    # Symlink docker-compose if needed
    if ! command -v docker-compose &> /dev/null; then
      sudo ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose || true
    fi
    
    echo "Docker installation completed"
EOF

# Step 3: Create deployment directory on EC2
echo "📁 Creating deployment directory..."
ssh -i "$KEY_FILE" "$REMOTE_USER@$EC2_IP" "mkdir -p ~/document-qa-system"

# Step 4: Copy files to EC2
echo "📤 Copying files to EC2..."
scp -i "$KEY_FILE" -r backend/ "$REMOTE_USER@$EC2_IP:~/document-qa-system/"
scp -i "$KEY_FILE" docker-compose.yml "$REMOTE_USER@$EC2_IP:~/document-qa-system/"

# Step 5: Set up environment file
echo "⚙️ Setting up environment file..."
ssh -i "$KEY_FILE" "$REMOTE_USER@$EC2_IP" << 'EOF'
    cd ~/document-qa-system
    if [ ! -f backend/.env ]; then
        echo "⚠️  Please create backend/.env file with your API keys:"
        echo "   OPENAI_API_KEY=sk-your-key-here"
        echo "   MONGODB_URI=mongodb://localhost:27017/documentqa"
        echo "   ALLOWED_ORIGINS=http://localhost:3000"
        echo ""
        echo "You can copy from env.example: cp backend/env.example backend/.env"
        echo "Then edit backend/.env with your actual keys"
    fi
EOF

# Step 6: Build and start containers
echo "🔨 Building and starting containers..."
ssh -i "$KEY_FILE" "$REMOTE_USER@$EC2_IP" << 'EOF'
    cd ~/document-qa-system
    
    # Log out and back in to apply docker group changes
    newgrp docker
    
    # Build and start containers
    docker-compose up --build -d
    
    echo "✅ Containers started successfully!"
    echo "🌐 Your backend is available at: http://$EC2_IP:8000"
    echo "📚 API docs at: http://$EC2_IP:8000/docs"
EOF

echo "🎉 Deployment completed!"
echo "🌐 Backend URL: http://$EC2_IP:8000"
echo "📚 API Docs: http://$EC2_IP:8000/docs"
echo ""
echo "📋 Next steps:"
echo "1. Test the backend: curl http://$EC2_IP:8000/"
echo "2. Deploy frontend to Vercel"
echo "3. Update CORS with your Vercel domain" 