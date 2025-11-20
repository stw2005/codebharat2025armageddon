import json
import random
from datetime import datetime, timedelta

# --- CONFIGURATION ---
COUNT = 50  # How many emails you want

# --- TEMPLATES ---
senders = [
    "angry.user@gmail.com", "happy.client@corp.com", "confused.dev@startup.io", 
    "hr@internal.com", "billing@finance.net", "support@vendor.com"
]

subjects = {
    "refund": ["Where is my refund?", "Chargeback initiated", "Refund status #9921", "Money not received"],
    "login": ["Cannot login", "Password reset loop", "2FA not working", "Account locked"],
    "feature": ["Feature request", "Can you add dark mode?", "Integration with Slack", "API access"],
    "policy": ["Urgent: Policy Update", "Compliance Review", "Terms of Service Change"],
    "praise": ["Great service!", "Thank you", "Kudos to the team", "Solved my issue"]
}

bodies = {
    "refund": "I have been waiting for {days} days. This is unacceptable. My order #{order_id} was cancelled but no money back. I will report this.",
    "login": "I am trying to login to my account but it keeps redirecting me to the home page. I tried on Chrome and Safari. Please help.",
    "feature": "Hi team, I love the product but I really need {feature}. When will this be available?",
    "policy": "Please review the attached document regarding the new {policy} guidelines effective immediately.",
    "praise": "Just wanted to say thanks to the support agent who helped me with ticket #{ticket_id}. They were fast and polite."
}

# --- GENERATOR LOGIC ---
dataset = []

for i in range(COUNT):
    category = random.choice(list(subjects.keys()))
    
    # 1. Pick random details
    sender = random.choice(senders)
    subject = random.choice(subjects[category])
    
    # 2. Fill in the templates
    body_template = bodies[category]
    body = body_template.format(
        days=random.randint(2, 30),
        order_id=random.randint(1000, 9999),
        feature="SSO Login",
        policy="Data Privacy",
        ticket_id=random.randint(10000, 99999)
    )
    
    # 3. Assign expected labels (So you can check if the ML model is right later)
    # This is your "Ground Truth"
    expected_sentiment = "positive" if category == "praise" else ("angry" if category == "refund" else "neutral")
    expected_urgency = "high" if category in ["refund", "policy"] else "medium"
    
    email_entry = {
        "id": i + 1,
        "sender": sender,
        "subject": subject,
        "body": body,
        "received_at": (datetime.now() - timedelta(minutes=random.randint(1, 1000))).isoformat(),
        "expected_analysis": {
            "sentiment": expected_sentiment,
            "urgency": expected_urgency,
            "category": category
        }
    }
    
    dataset.append(email_entry)

# --- SAVE TO FILE ---
with open("sample_dataset.json", "w") as f:
    json.dump(dataset, f, indent=2)

print(f"✅ Generated {COUNT} emails in 'sample_dataset.json'")