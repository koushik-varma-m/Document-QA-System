# Document Q&A System - AI20Labs Assignment

A full-stack web application that allows users to upload documents (PDF and TXT) and interact with an intelligent agent that can answer questions based on the uploaded content. The system includes web search capabilities and maintains chat history across sessions.

## 🎯 Features

### Core Functionality
- ✅ **Document Upload**: Support for PDF and TXT files
- ✅ **Intelligent Q&A**: LlamaIndex-powered document analysis
- ✅ **Chat History**: Persistent chat sessions with MongoDB
- ✅ **Web Search Integration**: Dappier tool for real-time information
- ✅ **Session Management**: Chat history persists across browser refreshes

### Frontend Features
- ✅ **Interactive UI**: Clean, modern React interface with TypeScript
- ✅ **New Chat**: Start fresh conversations
- ✅ **Chat History**: View and manage all chat sessions
- ✅ **Clear Chat**: Reset conversations
- ✅ **Dark/Light Theme**: Toggle between themes
- ✅ **Responsive Design**: Works on desktop and mobile
- ✅ **Local Storage**: Persists user preferences and chat data

### Backend Features
- ✅ **FastAPI**: Modern Python web framework
- ✅ **LlamaIndex**: Document processing and Q&A
- ✅ **ChromaDB**: Vector storage for embeddings
- ✅ **MongoDB**: Chat history and session storage
- ✅ **Docker**: Containerized deployment
- ✅ **HTTPS**: Secure communication with SSL certificate

### Bonus Features (Optional Requirements)
- ✅ **Web Search**: Dappier integration for real-time information
- ✅ **Database Storage**: MongoDB for chat history and sessions
- ✅ **Session Management**: User session handling
- ✅ **CI/CD**: GitHub Actions for automated deployment

## 🚀 Live Demo

- **Frontend**: https://document-qa-system-psi.vercel.app/
- **Backend API**: https://mydocqa.duckdns.org
- **API Documentation**: https://mydocqa.duckdns.org/docs
- **Demo Video**: [Watch Demo](https://drive.google.com/file/d/1-2-3-4-5/view?usp=sharing) - Complete walkthrough of the application

### Demo Features Showcased:
- 📄 Document upload (PDF and TXT files)
- 💬 Interactive Q&A with uploaded documents
- 🔍 Web search integration for real-time information
- 📚 Chat history management
- 🎨 Theme switching (dark/light mode)
- 📱 Responsive design
- ⚡ Real-time responses with similarity scoring

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks + localStorage
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI (Python)
- **Document Processing**: LlamaIndex
- **Vector Database**: ChromaDB
- **Document Database**: MongoDB
- **Web Search**: Dappier
- **Deployment**: AWS EC2 with Docker

## 📋 Prerequisites

- Python 3.12+
- Node.js 18+
- Docker and Docker Compose
- MongoDB (or use the provided Docker setup)
- OpenAI API key
- AWS EC2 instance (for production deployment)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd document-qa-system
```

### 2. Backend Setup

#### Local Development
```bash
cd backend
cp env.example .env
# Edit .env with your OpenAI API key and MongoDB URI
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Docker Setup
```bash
# Start all services (backend + MongoDB)
docker-compose up --build -d
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 4. Environment Variables

#### Backend (.env)
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
MONGODB_URI=mongodb://localhost:27017/documentqa
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.vercel.app
```

#### Frontend (Vercel Environment Variables)
```
REACT_APP_BACKEND_URL=https://mydocqa.duckdns.org
```

## 🐳 Production Deployment

### Backend (AWS EC2)
1. **Launch EC2 Instance**: Ubuntu 22.04 LTS
2. **Install Docker**: Use the provided `fix-docker.sh` script
3. **Deploy Backend**: Use the provided `deploy-ec2.sh` script
4. **Set up HTTPS**: Nginx + Let's Encrypt (Certbot)
5. **Configure Domain**: Point your domain to EC2 IP

### Frontend (Vercel)
1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Set Environment Variables**: Add `REACT_APP_BACKEND_URL`
3. **Deploy**: Vercel automatically deploys on push to main

## 📁 Project Structure

```
document-qa-system/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile          # Backend container
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── api/           # API client
│   │   ├── config/        # Configuration
│   │   └── types/         # TypeScript types
│   ├── package.json       # Node.js dependencies
│   └── public/           # Static assets
├── docker-compose.yml     # Multi-container setup
├── deploy-ec2.sh         # EC2 deployment script
└── README.md            # This file
```

## 🔧 API Endpoints

### Core Endpoints
- `POST /upload/` - Upload documents (PDF/TXT)
- `POST /query/` - Ask questions about documents
- `GET /chats/` - Get all chat sessions
- `POST /chats/` - Create new chat session
- `DELETE /chats/{chat_id}` - Delete chat session
- `GET /chats/{chat_id}/messages` - Get chat messages

### Configuration Endpoints
- `GET /chats/{chat_id}/threshold` - Get similarity threshold
- `POST /chats/{chat_id}/threshold` - Update similarity threshold

## 🎨 Features in Detail

### Document Processing
- **PDF Support**: Uses PyMuPDF for PDF parsing
- **Text Support**: Direct text file processing
- **Chunking**: Configurable chunk size and overlap
- **Embeddings**: OpenAI text-embedding-ada-002
- **Vector Storage**: ChromaDB for efficient similarity search

### Intelligent Q&A
- **Similarity Search**: Configurable threshold for relevance
- **Fallback Responses**: Clear messages when questions are unrelated
- **Web Search**: Dappier integration for real-time information
- **Cost Optimization**: Smart query filtering to reduce API costs

### Chat Management
- **Session Persistence**: MongoDB storage for chat history
- **Message Threading**: Organized conversation flow
- **Document Association**: Links documents to specific chats
- **Threshold Control**: Per-chat similarity settings

## 🔒 Security Features

- **CORS Configuration**: Proper origin validation
- **File Size Limits**: Configurable upload restrictions
- **API Key Management**: Secure environment variable handling
- **HTTPS**: SSL certificate for production
- **Input Validation**: Comprehensive request validation

## 📊 Performance Optimizations

- **Token Management**: Configurable chunk sizes and limits
- **Caching**: ChromaDB for fast similarity searches
- **Async Processing**: Non-blocking document processing
- **Memory Management**: Efficient file handling and cleanup

## 🧪 Testing

### Backend Testing
```bash
cd backend
python -m pytest tests/
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is part of the AI20Labs technical assignment.

## 🆘 Troubleshooting

### Common Issues

1. **Mixed Content Errors**: Ensure frontend uses HTTPS backend URL
2. **CORS Errors**: Check `ALLOWED_ORIGINS` in backend `.env`
3. **API Key Issues**: Verify OpenAI API key is valid and has credits
4. **Docker Issues**: Use `fix-docker.sh` script for EC2 setup
5. **Memory Issues**: Reduce chunk sizes in environment variables

### Support

For issues related to this assignment, please check the troubleshooting section above or refer to the deployment scripts for common solutions.

---

**🎉 Congratulations!** Your Document Q&A system is now fully deployed and ready to use! 