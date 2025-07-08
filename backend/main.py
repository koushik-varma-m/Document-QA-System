from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query
import numpy as np
import os
import uvicorn
from dotenv import load_dotenv
import asyncio

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Document
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.storage.storage_context import StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore 
from llama_index.readers.file import PyMuPDFReader
from llama_index.core import Settings

from dappier import Dappier

from pymongo import MongoClient
import uuid
from datetime import datetime

import chromadb

load_dotenv()

# Fix CORS origins definition
# Allow all origins for now (for development; restrict in production)
ALLOWED_ORIGINS = ["*"]

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
mongo = MongoClient(MONGO_URI)
db = mongo.ai20labs
chats = db.chats 
documents = db.documents  # New collection for document metadata

app = FastAPI()

# Use ALLOWED_ORIGINS directly as a list
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

current_document_id: str | None = None
chroma_client = None
chroma_collection_name = "document_qa_collection"

try:
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY not found in environment variables.")

    Settings.llm = OpenAI(model="gpt-3.5-turbo", api_key=openai_api_key)
    Settings.embed_model = OpenAIEmbedding(api_key=openai_api_key, model="text-embedding-ada-002")
    # Configurable chunk size for token optimization
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "512"))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "10"))
    Settings.node_parser = SentenceSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)

    # Use local ChromaDB storage
    chroma_client = chromadb.PersistentClient(path="./chroma_data")

    try:
        if openai_api_key:
            dappier_tool = Dappier(api_key=openai_api_key)
            print("Dappier tool initialized successfully for web search")
        else:
            print("Warning: OpenAI API key not available, web search disabled")
            dappier_tool = None
    except Exception as e:
        print(f"Warning: Dappier tool initialization failed: {e}")
        dappier_tool = None

except ValueError as e:
    print(f"Configuration Error: {e}")
except Exception as e:
    print(f"An unexpected error occurred during Llamaindex initialization: {e}")

if chroma_client is None:
    raise RuntimeError("ChromaDB client failed to initialize. Check your logs and environment variables.")




@app.get("/")
async def read_root():
    return {"message": "Welcome to the AI20 Labs Document Q&A Backend!"}





@app.post("/upload/")
async def upload_document(file: UploadFile = File(...), chat_id: str = Query(None, description="Chat ID to associate with this document")):
    
    global chroma_client, current_document_id
    
    if not chroma_client:
        raise HTTPException(status_code=500, detail="ChromaDB client not initialized")
    if not Settings.llm or not Settings.embed_model:
        raise HTTPException(status_code=500, detail="Llamaindex LLM or Embed Model not initialized. Check API Key.")
    
    if file.content_type not in ["application/pdf", "text/plain"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    # Configurable limits to reduce token consumption
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", "5")) * 1024 * 1024  # Default 5MB
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Maximum size is 5MB. Your file is {len(content) / (1024*1024):.1f}MB"
        )
    
    file_location = f"temp_{file.filename}"
    try:
        # Content already read above for size check
        def write_file():
            with open(file_location, "wb") as f:
                f.write(content)
        await asyncio.to_thread(write_file)
        
        documents_list = []
        if file.content_type == "application/pdf":
            reader = PyMuPDFReader()
            docs_from_pdf = await asyncio.to_thread(reader.load_data, file_location)
            
            # Limit PDF pages to reduce token consumption
            MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "20"))
            if len(docs_from_pdf) > MAX_PDF_PAGES:
                docs_from_pdf = docs_from_pdf[:MAX_PDF_PAGES]
                print(f"Warning: PDF truncated to first {MAX_PDF_PAGES} pages to reduce token consumption")
            
            documents_list.extend(docs_from_pdf)
        elif file.content_type == "text/plain":
            def read_text_file():
                with open(file_location, 'r', encoding='utf-8') as f:
                    return f.read()
            text_content = await asyncio.to_thread(read_text_file)
            
            # Limit text content to reduce token consumption
            MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", "50000"))  # ~12,500 tokens (rough estimate)
            if len(text_content) > MAX_TEXT_LENGTH:
                text_content = text_content[:MAX_TEXT_LENGTH]
                print(f"Warning: Text file truncated to {MAX_TEXT_LENGTH} characters to reduce token consumption")
            
            documents_list.append(Document(text=text_content, id_=file.filename))
        
        if not documents_list:
            raise HTTPException(status_code=500, detail="Failed to load document content. Document might be empty or unreadable.")
        
        document_id = str(uuid.uuid4())
        collection_name = f"document_{document_id}"
        
        chroma_collection = chroma_client.get_or_create_collection(collection_name)
        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
        
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        document_index = VectorStoreIndex.from_documents(
            documents_list,
            storage_context=storage_context,
            show_progress=True
        )
        
        document_metadata = {
            "document_id": document_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "collection_name": collection_name,
            "uploaded_at": datetime.utcnow(),
            "chat_id": chat_id,
            "chunk_count": len(documents_list)
        }
        
        documents.insert_one(document_metadata)
        
        if not chat_id:
            current_document_id = document_id

        return JSONResponse(content={
            "message": f"Successfully processed '{file.filename}' and stored in collection '{collection_name}'.",
            "document_id": document_id,
            "collection_name": collection_name
        })
        
    except Exception as e:
        print(f"Error during document upload and processing: {e}")
        error_message = str(e)
        
        if "insufficient_quota" in error_message or "quota" in error_message.lower():
            raise HTTPException(
                status_code=429, 
                detail="OpenAI API quota exceeded. Please check your billing or try again later."
            )
        elif "rate limit" in error_message.lower():
            raise HTTPException(
                status_code=429, 
                detail="OpenAI API rate limit exceeded. Please wait a moment and try again."
            )
        else:
            raise HTTPException(status_code=500, detail=f"Error processing document: {error_message}")
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)
            
@app.post("/query/")
async def query_document(question_payload: dict, threshold: float = Query(0.3, description="Minimum similarity to answer"), use_web_search: bool = Query(False, description="Enable web search fallback")):
    global chroma_client, dappier_tool

    user_question = question_payload.get("question")
    chat_id = question_payload.get("chat_id")
    
    if not user_question:
        raise HTTPException(status_code=400, detail="Question is required in the request body.")

    if not chat_id:
        raise HTTPException(status_code=400, detail="Chat ID is required to determine which document to query.")

    try:
        chat_document = documents.find_one({"chat_id": chat_id})
        if not chat_document:
            return JSONResponse(content={"answer": "No document is associated with this chat. Please upload a document first."})
        
        collection_name = chat_document["collection_name"]
        
        collection = chroma_client.get_collection(collection_name)
        
        if collection.count() == 0:
            return JSONResponse({"answer": "No documents have been indexed for this chat. Please upload a document first."})
        
        embedding_model = Settings.embed_model
        q_embed = embedding_model.get_text_embedding(user_question)
        
        results = collection.query(
            query_embeddings=[q_embed],
            n_results=1,
            include=["distances"]
        )
        
        if not results or len(results) == 0:
            return JSONResponse({"answer": "No relevant content found in the document."})
            
        dist = results["distances"][0][0]

        use_web_fallback = False
        web_search_reason = ""
        
        if use_web_search and dappier_tool:
            if dist > threshold:
                use_web_fallback = True
                web_search_reason = f"Document similarity ({dist:.3f}) below threshold ({threshold})"
            elif any(keyword in user_question.lower() for keyword in [
                "latest", "current", "recent", "today", "now", "update", "news", 
                "2024", "2025", "this year", "this month", "this week"
            ]):
                if dist < 0.8:
                    use_web_fallback = True
                    web_search_reason = "Question asks for current/recent information"
                else:
                    use_web_fallback = False
                    web_search_reason = "Question not relevant to document content"
            else:
                if dist > 0.7:
                    use_web_fallback = False
                    web_search_reason = "Question not relevant to document content"
                else:
                    use_web_fallback = True
                    web_search_reason = "Document similarity low, attempting web search"
        
        if dist > threshold and not use_web_fallback:
            answer = f"I couldn't find relevant information in the document for this question. (Similarity: {dist:.3f}, Threshold: {threshold})"
            await store_chat_message(chat_id, user_question, answer, dist, threshold, web_search_used=False)
            return JSONResponse({
                "answer": answer,
                "debug_dist": dist,
                "threshold": threshold,
                "web_search_used": False,
                "web_search_reason": web_search_reason
            })

        # 5) Create query engine with appropriate tools
        vector_store = ChromaVectorStore(chroma_collection=collection)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        # Recreate the index for this document
        document_index = VectorStoreIndex.from_documents(
            [],  # Empty list since documents are already in ChromaDB
            storage_context=storage_context
        )
        
        # Configure query engine based on whether web search is needed
        if use_web_fallback:
            # Enhanced system prompt for web search
            system_prompt = f"""
You are a document Q&A assistant with web search capabilities.

INSTRUCTIONS:
1. The user has uploaded a document that you should reference first
2. Document similarity score: {dist:.3f} (threshold: {threshold})
3. Web search is enabled because: {web_search_reason}
4. COMBINE document knowledge with web information when relevant
5. Always cite your sources clearly

RESPONSE FORMAT:
- Start with document knowledge if available
- Add web information when relevant
- Use format: "From the document: [X]. From web search: [Y]"
- If document has no relevant info: "From web search: [answer]"

COST CONTROL: Use web search efficiently and be concise.
"""
            
            query_engine = document_index.as_query_engine(
                response_mode="compact",
                similarity_top_k=3,
                system_prompt=system_prompt
            )
            
            # Perform web search separately and combine results
            try:
                web_results = await asyncio.to_thread(
                    dappier_tool.search_real_time_data_string,
                    user_question
                )
                
                # Combine document and web search results
                document_response = await query_engine.aquery(user_question)
                
                # Try to get the text from the response object
                if hasattr(document_response, 'response'):
                    document_answer = str(document_response.response)
                elif hasattr(document_response, 'text'):
                    document_answer = str(document_response.text)
                elif hasattr(document_response, 'message'):
                    document_answer = str(document_response.message)
                else:
                    document_answer = str(document_response)
                    
                if web_results and len(web_results) > 0:
                    # web_results is a string, so we can use it directly
                    combined_prompt = f"""
You are answering a question about a document with additional web information.

Document answer: {document_answer}

Web search information: {web_results}

Please provide a comprehensive answer that clearly indicates the sources:
1. Start with "📄 From the document:" if the document contains relevant information
2. Then add "🌐 From web search:" with the web information
3. If the document has no relevant info, start with "🌐 From web search:"
4. Be concise and accurate
5. Always cite your sources clearly

Question: {user_question}
"""
                    
                    # Get final response using LLM
                    llm = Settings.llm
                    final_response = await llm.acomplete(combined_prompt)
                    
                    # Try to get the text from the response object
                    if hasattr(final_response, 'response'):
                        answer = str(final_response.response)
                    elif hasattr(final_response, 'text'):
                        answer = str(final_response.text)
                    elif hasattr(final_response, 'message'):
                        answer = str(final_response.message)
                    else:
                        answer = str(final_response)
                        
                else:
                    # No web results found, use document answer with clear indication
                    if document_answer and document_answer.strip():
                        answer = f"📄 From the document: {document_answer}"
                    else:
                        answer = "I couldn't find relevant information in the document or through web search."
                    
            except Exception as web_error:
                print(f"Web search failed: {web_error}")
                # Fallback to document-only response
                response = await query_engine.aquery(user_question)
                
                # Try to get the text from the response object
                if hasattr(response, 'response'):
                    answer = str(response.response)
                elif hasattr(response, 'text'):
                    answer = str(response.text)
                elif hasattr(response, 'message'):
                    answer = str(response.message)
                else:
                    answer = str(response)
                    
        else:
            # Standard system prompt for document-only
            system_prompt = f"""
You are a document Q&A assistant.

INSTRUCTIONS:
1. Answer questions based ONLY on the uploaded document content
2. Document similarity score: {dist:.3f} (threshold: {threshold})
3. If the document doesn't contain the answer, say so clearly
4. Be concise and accurate
5. Always start your response with "📄 From the document:"

RESPONSE FORMAT:
"📄 From the document: [answer]"

If no relevant information is found:
"I couldn't find relevant information in the document for this question."
"""
            
            query_engine = document_index.as_query_engine(
                response_mode="compact",
                similarity_top_k=3,
                system_prompt=system_prompt
            )
            
            response = await query_engine.aquery(user_question)
            
            # Try to get the text from the response object
            if hasattr(response, 'response'):
                answer = str(response.response)
            elif hasattr(response, 'text'):
                answer = str(response.text)
            elif hasattr(response, 'message'):
                answer = str(response.message)
            else:
                answer = str(response)
            
            # Ensure the answer has the proper format
            if not answer.startswith("📄 From the document:"):
                answer = f"📄 From the document: {answer}"
        
        # Store the chat message with web search info
        await store_chat_message(chat_id, user_question, answer, dist, threshold, web_search_used=use_web_fallback)
        
        return JSONResponse({
            "answer": answer,
            "web_search_used": use_web_fallback,
            "web_search_reason": web_search_reason if use_web_fallback else None,
            "debug_dist": dist,
            "threshold": threshold
        })

    except Exception as e:
        print(f"Error during document query: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error querying document: {str(e)}")

async def store_chat_message(chat_id: str, question: str, answer: str, distance: float, threshold: float, web_search_used: bool = False):
    try:
        if not chat_id:
            chat_id = str(uuid.uuid4())
        
        chat_message = {
            "chat_id": chat_id,
            "question": question,
            "answer": answer,
            "distance": distance,
            "threshold": threshold,
            "web_search_used": web_search_used,
            "timestamp": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        
        chats.insert_one(chat_message)
        
    except Exception as e:
        print(f"Error storing chat message: {e}")

async def create_empty_chat_session(chat_id: str):
    try:
        empty_message = {
            "chat_id": chat_id,
            "question": "Chat started",
            "answer": "Ready to ask questions about your document",
            "distance": 0.0,
            "threshold": 0.5,
            "timestamp": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        
        chats.insert_one(empty_message)
        
    except Exception as e:
        print(f"Error creating empty chat session: {e}")

@app.post("/chats/{chat_id}/threshold")
async def update_chat_threshold(chat_id: str, threshold_data: dict):
    try:
        new_threshold = threshold_data.get("threshold", 0.5)
        
        result = chats.update_many(
            {"chat_id": chat_id},
            {"$set": {"threshold": new_threshold}}
        )
        
        return JSONResponse({
            "message": f"Threshold updated to {new_threshold} for chat {chat_id}",
            "updated_count": result.modified_count
        })
        
    except Exception as e:
        print(f"Error updating chat threshold: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating chat threshold: {str(e)}")

@app.get("/chats/{chat_id}/threshold")
async def get_chat_threshold(chat_id: str):
    try:
        latest_message = chats.find_one(
            {"chat_id": chat_id},
            sort=[("timestamp", -1)]
        )
        
        if not latest_message:
            return JSONResponse({"threshold": 0.5})
        
        return JSONResponse({"threshold": latest_message.get("threshold", 0.5)})
        
    except Exception as e:
        print(f"Error getting chat threshold: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting chat threshold: {str(e)}")

@app.get("/chats/")
async def get_chats():
    try:
        pipeline = [
            {"$sort": {"timestamp": -1}},
            {"$group": {
                "_id": "$chat_id",
                "latest_question": {"$first": "$question"},
                "latest_answer": {"$first": "$answer"},
                "latest_timestamp": {"$first": "$timestamp"},
                "message_count": {"$sum": 1}
            }},
            {"$sort": {"latest_timestamp": -1}}
        ]
        
        chat_sessions = list(chats.aggregate(pipeline))
        
        for session in chat_sessions:
            if isinstance(session.get("latest_timestamp"), datetime):
                session["latest_timestamp"] = session["latest_timestamp"].isoformat()
        
        return JSONResponse({
            "chats": chat_sessions
        })
        
    except Exception as e:
        print(f"Error retrieving chats: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving chats: {str(e)}")

@app.get("/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: str):
    try:
        messages = list(chats.find(
            {"chat_id": chat_id},
            {"_id": 0}
        ).sort("timestamp", 1))
        
        for message in messages:
            if isinstance(message.get("timestamp"), datetime):
                message["timestamp"] = message["timestamp"].isoformat()
            if isinstance(message.get("created_at"), datetime):
                message["created_at"] = message["created_at"].isoformat()
        
        return JSONResponse({
            "chat_id": chat_id,
            "messages": messages
        })
        
    except Exception as e:
        print(f"Error retrieving chat messages: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving chat messages: {str(e)}")

@app.post("/chats/")
async def create_chat():
    try:
        chat_id = str(uuid.uuid4())
        
        await create_empty_chat_session(chat_id)
        
        return JSONResponse({
            "chat_id": chat_id,
            "message": "New chat session created"
        })
        
    except Exception as e:
        print(f"Error creating chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating chat: {str(e)}")

@app.delete("/chats/{chat_id}")
async def delete_chat(chat_id: str):
    try:
        print(f"Deleting chat_id: {chat_id}")
        
        result = chats.delete_many({"chat_id": chat_id})
        
        print(f"Deleted {result.deleted_count} messages for chat_id: {chat_id}")
        
        return JSONResponse({
            "message": f"Chat session deleted successfully. Removed {result.deleted_count} messages.",
            "deleted_count": result.deleted_count
        })
        
    except Exception as e:
        print(f"Error deleting chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting chat: {str(e)}")

@app.get("/chats/{chat_id}/documents")
async def get_chat_documents(chat_id: str):
    try:
        chat_docs = list(documents.find(
            {"chat_id": chat_id},
            {"_id": 0}
        ).sort("uploaded_at", -1))
        
        for doc in chat_docs:
            if isinstance(doc.get("uploaded_at"), datetime):
                doc["uploaded_at"] = doc["uploaded_at"].isoformat()
        
        return JSONResponse({
            "chat_id": chat_id,
            "documents": chat_docs
        })
        
    except Exception as e:
        print(f"Error retrieving chat documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving chat documents: {str(e)}")

@app.get("/documents/")
async def get_all_documents():
    try:
        all_docs = list(documents.find(
            {},
            {"_id": 0}
        ).sort("uploaded_at", -1))
        
        for doc in all_docs:
            if isinstance(doc.get("uploaded_at"), datetime):
                doc["uploaded_at"] = doc["uploaded_at"].isoformat()
        
        return JSONResponse({
            "documents": all_docs
        })
        
    except Exception as e:
        print(f"Error retrieving documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving documents: {str(e)}")
    
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)