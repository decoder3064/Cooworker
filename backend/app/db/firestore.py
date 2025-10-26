from google.cloud import firestore
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Firestore client
try:
    db = firestore.Client(project=os.getenv("FIREBASE_PROJECT_ID"))
    print("✅ Firestore client initialized")
except Exception as e:
    print(f"❌ Failed to initialize Firestore: {e}")
    db = None

def get_firestore_db():
    """Get Firestore database instance"""
    if db is None:
        raise Exception("Firestore not initialized")
    return db