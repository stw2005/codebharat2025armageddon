import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

# --- CONFIGURATION ---
# ⚠️ Ensure this file matches the JSON file you downloaded from Google ⚠️
GMAIL_CLIENT_SECRET_FILE = "client_secret_737666065056-4bsl0bsl9pcljbm0m3k2gtp2glkog8vc.apps.googleusercontent.com.json" 
GMAIL_TOKEN_FILE = "gmail_token.json"
GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# --- AUTH SCRIPT ---
def authenticate_gmail():
    """Shows how to authenticate with the GMail API."""
    creds = None
    if os.path.exists(GMAIL_TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(GMAIL_TOKEN_FILE, GMAIL_SCOPES)
        
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing GMail token...")
            creds.refresh(Request())
        else:
            # Check if the required client secret file exists
            if not os.path.exists(GMAIL_CLIENT_SECRET_FILE):
                 print(f"❌ ERROR: Authentication JSON file '{GMAIL_CLIENT_SECRET_FILE}' not found!")
                 print("Please ensure your downloaded Google JSON file is renamed and in the backend folder.")
                 return

            # This initiates the browser login flow
            flow = InstalledAppFlow.from_client_secrets_file(
                GMAIL_CLIENT_SECRET_FILE, GMAIL_SCOPES)
            
            print("🌐 Opening browser for Google login...")
            creds = flow.run_local_server(port=0) 

        # Save the credentials for the next run
        with open(GMAIL_TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
        print(f"✅ Authentication successful! Token saved to {GMAIL_TOKEN_FILE}")
        
    else:
        print(f"🔑 Token already valid. Ready to use.")

if __name__ == '__main__':
    authenticate_gmail()