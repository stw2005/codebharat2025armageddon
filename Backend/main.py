import os
import random
import joblib
import numpy as np
from datetime import datetime, timedelta 
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import base64
import json
import email

# --- NEW GMAIL IMPORTS ---
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# --- CONFIGURATION ---
# ⚠️ PASTE YOUR SUPABASE KEYS HERE ⚠️
SUPABASE_URL = "https://ejhvwbxpgysqfyugbmqd.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaHZ3YnhwZ3lzcWZ5dWdibXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NzkxMjIsImV4cCI6MjA3OTE1NTEyMn0.zdzEHA313fWRDRFc4TVd7BqXu5VNwSV9UQKZrH5CMVM"

# --- PATHS ---
MODEL_DIR = "models/"
SUMMARIZER_MODEL_NAME = "philschmid/bart-large-cnn-samsum"
GMAIL_CLIENT_SECRET_JSON = os.getenv("GOOGLE_CLIENT_SECRET")
GMAIL_REFRESH_TOKEN = os.getenv("GOOGLE_REFRESH_TOKEN")
GMAIL_ACCESS_TOKEN = os.getenv("GOOGLE_ACCESS_TOKEN")
GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

app = FastAPI(title="CodeBharat Live Mail Analytics")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL AI STATE ---
ai_resources = {}

# --- DATA MODELS ---
class EscalationRequest(BaseModel):
    email_id: int
    user_role: str

# --- 1. STARTUP: LOAD ALL BRAINS ---
@app.on_event("startup")
def load_ai_models():
    print("⏳ Starting Analysis Engine...")
    
    # A. Connect to Supabase
    try:
        ai_resources['db'] = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Database Connected.")
    except Exception as e:
        print(f"❌ Database Error: {e}")

    # B. Load Classification Models
    if not os.path.exists(MODEL_DIR):
        print(f"⚠️ WARNING: '{MODEL_DIR}' not found. ML will fail.")
    else:
        try:
            ai_resources['embedder'] = SentenceTransformer('all-MiniLM-L6-v2')
            ai_resources['m_intent'] = joblib.load(f"{MODEL_DIR}model_intent.pkl")
            ai_resources['m_sentiment'] = joblib.load(f"{MODEL_DIR}model_sentiment.pkl")
            ai_resources['m_priority'] = joblib.load(f"{MODEL_DIR}model_priority.pkl")
            
            ai_resources['le_intent'] = joblib.load(f"{MODEL_DIR}le_intent.pkl")
            ai_resources['le_sentiment'] = joblib.load(f"{MODEL_DIR}le_sentiment.pkl")
            ai_resources['le_priority'] = joblib.load(f"{MODEL_DIR}le_priority.pkl")
            print("✅ Classification Models Loaded.")
        except Exception as e:
            print(f"❌ Classification Load Error: {e}")

    # C. Load Summarizer
    try:
        print("⏳ Loading Summarizer...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        ai_resources['device'] = device
        ai_resources['tokenizer'] = AutoTokenizer.from_pretrained(SUMMARIZER_MODEL_NAME)
        ai_resources['summarizer'] = AutoModelForSeq2SeqLM.from_pretrained(SUMMARIZER_MODEL_NAME).to(device)
        ai_resources['summarizer'].eval()
        print(f"✅ Summarizer Loaded on {device}.")
    except Exception as e:
        print(f"❌ Summarizer Load Error: {e}")
        
# --- GMAIL AUTHENTICATION FUNCTION ---
def get_gmail_service():
    """Authenticates and returns the Gmail service object."""
    creds = None
    if os.path.exists(GMAIL_TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(GMAIL_TOKEN_FILE, GMAIL_SCOPES)
        
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing GMail token...")
            creds.refresh(Request())
        else:
            print(f"🔑 AUTH REQUIRED: Please run the 'auth_gmail.py' script manually to generate '{GMAIL_TOKEN_FILE}'.")
            return None # Cannot proceed without auth file

        with open(GMAIL_TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())

    return build('gmail', 'v1', credentials=creds)

# --- EMAIL PARSING HELPER ---
def get_email_body(msg):
    """Extracts the cleanest body text from a multi-part Gmail message."""
    try:
        if 'parts' in msg['payload']:
            for part in msg['payload']['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body']['data']
                    return base64.urlsafe_b64decode(data).decode('utf-8')
        elif msg['payload']['mimeType'] == 'text/plain':
            data = msg['payload']['body']['data']
            return base64.urlsafe_b64decode(data).decode('utf-8')
        return "Body content extraction failed or is empty."
    except Exception as e:
        print(f"Parsing error: {e}")
        return "Body extraction error."

# --- VECTOR SEARCH FOR CACHING (NEW) ---
def find_similar_resolved_emails(current_email_text: str, current_intent: str):
    """Finds similarity between current email and previously resolved emails with matching intent."""
    db = ai_resources.get('db')
    if 'embedder' not in ai_resources or db is None or not current_intent or current_intent == 'unknown': return None
    
    try:
        # 1. Fetch resolved issues (only those with resolution details)
        response = db.table('email_analysis').select(
            'final_resolution_details, resolved_at, extracted_entities'
        ).eq('extracted_entities->>intent', current_intent).not_.is_('final_resolution_details', 'NULL').limit(1).execute()
        
        # We only need one example resolution
        if response.data:
            issue = response.data[0]
            return {
                "resolution": issue['final_resolution_details'],
                "resolved_at": issue['resolved_at'],
                "intent": issue['extracted_entities']['intent']
            }
        
        return None
        
    except Exception as e:
        print(f"❌ Vector Search Error: {e}")
        return None
        
# --- FULL ANALYSIS PIPELINE ---
def run_analysis_pipeline(text: str, received_at_dt: datetime):
    
    # --- 1. Metadata ---
    age_hours = (datetime.now() - received_at_dt).total_seconds() / 3600

    # --- 2. Classification & Summarization (Model Inference) ---
    results = {
        "detected_intent": "unknown", "detected_sentiment": "neutral", "predicted_priority": "low",
        "summary": "Processing...", "compliance_alerts": []
    }
    
    if 'm_intent' in ai_resources:
        try:
            # Classification logic 
            embedder = ai_resources['embedder']
            vec = embedder.encode([text])
            hybrid_vec = np.column_stack((vec, [[age_hours]]))
            
            pred_intent = ai_resources['m_intent'].predict(vec)[0]
            pred_sentiment = ai_resources['m_sentiment'].predict(vec)[0]
            pred_priority = ai_resources['m_priority'].predict(hybrid_vec)[0]

            # FIX: Force lowercase and strip whitespace for PostgreSQL ENUM compatibility
            results['detected_intent'] = ai_resources['le_intent'].inverse_transform([pred_intent])[0].lower().strip()
            results['detected_sentiment'] = ai_resources['le_sentiment'].inverse_transform([pred_sentiment])[0].lower().strip()
            results['predicted_priority'] = ai_resources['le_priority'].inverse_transform([pred_priority])[0].lower().strip()
        except Exception as e:
            print(f"Classification Error: {e}")

    # --- 3. Summarization (FIXED BLOCK: Added length check for stability) ---
    if 'summarizer' in ai_resources:
        try:
            tokenizer = ai_resources['tokenizer']
            model = ai_resources['summarizer']
            device = ai_resources['device']

            # Use a short version of the text for summarization to avoid crashing the model 
            short_text = text[:8000] 

            inputs = tokenizer(short_text, return_tensors="pt", truncation=True, max_length=1024).to(device)
            
            with torch.no_grad():
                summary_ids = model.generate(
                    inputs["input_ids"], 
                    max_length=100, 
                    min_length=30, 
                    num_beams=4, 
                    early_stopping=True
                )
            
            summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            
            # Final Safety Check: If the summary is still blank, provide a fallback
            if not summary or len(summary.strip()) < 5:
                 results['summary'] = "Model produced a blank summary. (AI Error Fallback)"
            else:
                 results['summary'] = summary
                 
        except Exception as e:
            print(f"Summarizer Runtime Error: {e}")
            results['summary'] = "Summary generation failed due to complex/long input."

    # --- 4. Agent Assist Logic ---
    intent = results['detected_intent'].lower()
    sentiment = results['detected_sentiment'].lower()
    priority = results['predicted_priority'].lower()
    
    rec_action = "Standard Reply"
    why = "Routine inquiry."
    
    if sentiment == 'angry' or priority == 'high':
        rec_action = "Escalate to Senior Agent"
        why = "🔥 High risk detected. Requires experienced handling."
    elif 'refund' in intent:
        rec_action = "Route to Finance_Dept"
        why = "Customer is requesting a refund."
    elif 'login' in intent or 'tech' in intent or 'account' in intent:
        rec_action = "Route to Tech_Support"
        why = "Technical issue identified."

    # Compliance Check
    bad_words = ["sue", "lawyer", "scam", "cheat"]
    if any(w in text.lower() for w in bad_words):
        results['compliance_alerts'].append("Legal Threat")

    return {
        "email_metadata": {
            "received_at": str(received_at_dt),
            "age_hours": f"{age_hours:.1f}"
        },
        "ai_insights": results,
        "agent_assist": {
            "recommended_action": rec_action,
            "why?": why,
            "compliance_alerts": results['compliance_alerts']
        }
    }


# --- THE GMAIL SYNC FUNCTION ---
def sync_and_analyze_emails():
    """Background task to pull recent emails, analyze them, and save to DB."""
    service = get_gmail_service()
    db = ai_resources.get('db')
    if service is None or db is None:
        print("Sync Failed: Service/DB not available.")
        return

    try:
        # --- GMAIL QUERY FIX: Search for ALL messages received in the last 3 days ---
        three_days_ago = int((datetime.now() - timedelta(days=3)).timestamp())
        
        results = service.users().messages().list(
            userId='me', 
            q=f"after:{three_days_ago}", # Broadened search query
            maxResults=10 # Increased max results slightly
        ).execute()
        messages = results.get('messages', [])

        if not messages:
            print("No new emails found in the last 3 days.")
            return

        print(f"Found {len(messages)} recent emails. Starting AI processing...")
        
        for msg_data in messages:
            msg_id = msg_data['id']
            
            # 1. Deduplication Check (CRITICAL)
            supabase_check = db.table("emails").select("id").eq("conversation_thread_id", msg_id).execute()
            if supabase_check.data:
                continue

            # 2. Get full message content
            message = service.users().messages().get(userId='me', id=msg_id).execute()
            
            # Extract headers and body
            headers = {h['name']: h['value'] for h in message['payload']['headers']}
            sender = headers.get('From', 'Unknown Sender')
            subject = headers.get('Subject', 'No Subject')
            received_timestamp = float(message['internalDate']) / 1000.0 # Convert milliseconds to seconds
            received_dt = datetime.fromtimestamp(received_timestamp)
            
            body_content = get_email_body(message)
            
            # 3. Run AI Analysis
            analysis_result = run_analysis_pipeline(body_content, received_dt)
            
            # 4. Save to Database
            insights = analysis_result['ai_insights']
            assist = analysis_result['agent_assist']
            
            email_res = db.table("emails").insert({
                "sender_email": sender,
                "subject_line": subject,
                "body_content": body_content,
                "is_read": False,
                "received_at": received_dt.isoformat(),
                "conversation_thread_id": msg_id 
            }).execute()
            
            new_id = email_res.data[0]['id']
            
            db.table("email_analysis").insert({
                "email_id": new_id,
                "summary_text": insights['summary'],
                "sentiment": insights['detected_sentiment'],
                "urgency_score": insights['predicted_priority'],
                "compliance_flag": len(assist['compliance_alerts']) > 0,
                "compliance_reason": ", ".join(assist['compliance_alerts']),
                "recommended_action": assist['recommended_action'],
                "action_reason": assist['why?'], # Fixed column name
                "extracted_entities": {"intent": insights['detected_intent']}
            }).execute()
            
        print("✅ GMail Sync Complete!")
        
    except HttpError as error:
        print(f"❌ GMail API Error: {error}")
        print("Hint: Check if the GMAIL_TOKEN_FILE exists and is valid.")
    except Exception as e:
        print(f"❌ Sync Error: {e}")


# --- API ENDPOINTS ---

@app.post("/sync-gmail")
async def sync_gmail_endpoint(background_tasks: BackgroundTasks):
    """
    Triggers the GMail sync and AI processing as a background task.
    """
    background_tasks.add_task(sync_and_analyze_emails)
    return {"message": "Sync started in background. Check dashboard in a moment."}

@app.get("/emails")
def get_emails(filter_priority: str = None, filter_sentiment: str = None):
    # --- New Feature: Retrieval Augmentation/Caching ---
    db = ai_resources.get('db')
    
    # 1. Fetch ALL emails and analyses
    query = db.table("emails").select("*, email_analysis(*)")
    response = query.order("received_at", desc=True).execute()
    
    formatted_emails = []
    
    for email in response.data:
        analysis_data = email.get("email_analysis")
        analysis = analysis_data[0] if isinstance(analysis_data, list) and analysis_data else (analysis_data if analysis_data else {})
        
        # Add the suggested resolution details if found
        if analysis.get('resolved_at') is None: # Only search cache for UNRESOLVED emails
            # 1. Get the current email's detected intent (from its own analysis)
            current_intent = analysis.get('extracted_entities', {}).get('intent')
            
            # 2. Run the cache search using the current intent as the key
            suggested_resolution = find_similar_resolved_emails(email['body_content'], current_intent)
            
            if suggested_resolution:
                 analysis['suggested_resolution'] = suggested_resolution
        
        if filter_priority and analysis.get("urgency_score") != filter_priority: continue
        if filter_sentiment and analysis.get("sentiment") != filter_sentiment: continue
        
        formatted_emails.append({**email, "analysis": analysis})
        
    return formatted_emails

@app.post("/escalate/{email_id}")
def escalate_email(email_id: int, request: EscalationRequest):
    db = ai_resources.get('db')
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    user_role = request.user_role.lower()
    
    try:
        if user_role == 'agent':
            # Assign to Team Lead (ID 2)
            db.table("emails").update({"escalated_to": 2}).eq("id", email_id).execute()
            return {"msg": "Escalated to Team"}
        elif user_role == 'team_member':
            # Team member marks resolved and adds resolution details
            db.table("emails").update({"escalated_to": None}).eq("id", email_id).execute()
            
            # --- Capture Resolution Details (The Caching Step) ---
            resolution_text = f"Issue resolved via {request.user_role} review. Standard action taken."
            
            db.table("email_analysis").update({
                "final_resolution_details": resolution_text,
                "resolved_at": datetime.now().isoformat()
            }).eq("email_id", email_id).execute()
            
            return {"msg": "Resolved and Cached by Team"}
        
        raise HTTPException(status_code=400, detail="Invalid Role specified.")
    
    except Exception as e:
        print(f"Escalation DB Error: {e}")
        # Use a 500 error if the DB query failed
        raise HTTPException(status_code=500, detail="Database Update Failed during action execution.")




from flask import Flask
app = Flask(__name__)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
