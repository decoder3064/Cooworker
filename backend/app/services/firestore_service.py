from google.cloud import firestore
from app.db.firestore import get_firestore_db
import uuid

db = get_firestore_db()

class FirestoreService: 

    @staticmethod
    async def create_or_update_user(user_id: str, email: str, display_name: str):
        """Create or update user profile"""
        user_ref = db.collection('users').document(user_id)
        user_data = {
            'id': user_id,
            'email': email,
            'displayName': display_name,
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        user_ref.set(user_data, merge=True)
        print(f"✅ User created/updated: {user_id}")
        return user_data
