from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Lifespan context manager (replaces on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Server starting up...")
    print("📡 API running on http://localhost:8080")
    print("📖 Docs available at http://localhost:8080/docs")
    
    yield  # Server runs here
    
    # Shutdown
    print("👋 Server shutting down...")

# Create FastAPI app
app = FastAPI(
    title="Conversational Workspace API",
    description="Real-time chat with AI agents",
    version="1.0.0",
    lifespan=lifespan  # ← New way to handle startup/shutdown
)

# CORS - allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic routes
@app.get("/")
async def root():
    return {
        "message": "Conversational Workspace API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
