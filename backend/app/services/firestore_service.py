from google.cloud import firestore
from app.db.firestore import get_firestore_db
import uuid

db = get_firestore_db()

class FirestoreService: 

    @staticmethod
    async def create_or_update_user(user_id: str, display_name: str = None):
        """Create or update user profile"""
        user_ref = db.collection('users').document(user_id)
        user_data = {
            'id': user_id,
            'displayName': display_name or user_id,
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        user_ref.set(user_data, merge=True)
        print(f"User created/updated: {user_id}")
        return user_data
    
    @staticmethod
    async def create_workspace(host_id: str, name: str):
        """
        Create a new workspace (chat room)
        Used by: POST /workspace/create
        """
        workspace_id = str(uuid.uuid4())
        workspace_ref = db.collection('workspaces').document(workspace_id)
        
        workspace_data = {
            'id': workspace_id,
            'name': name,
            'hostId': host_id,
            'participantCount': 1,  
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        workspace_ref.set(workspace_data)
        
        # Add host as first member
        member_ref = workspace_ref.collection('members').document(host_id)
        member_ref.set({
            'userId': host_id,
            'role': 'host',
            'joinedAt': firestore.SERVER_TIMESTAMP
        })
        
        print(f"✅ Workspace created: {workspace_id} - {name}")
        return workspace_id
    

    @staticmethod
    async def join_workspace(user_id: str, workspace_id: str):
        """
        Add user as member of workspace
        Used by: POST /workspace/join
        """
        # Check workspace exists
        workspace_ref = db.collection('workspaces').document(workspace_id)
        workspace_doc = workspace_ref.get()
        
        if not workspace_doc.exists:
            return None
        
        # Add user as member
        member_ref = workspace_ref.collection('members').document(user_id)
        member_ref.set({
            'userId': user_id,
            'role': 'member',
            'joinedAt': firestore.SERVER_TIMESTAMP
        })
        
        print(f"✅ User {user_id} joined workspace {workspace_id}")
        return workspace_id
