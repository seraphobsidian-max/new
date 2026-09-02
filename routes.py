from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from firebase_admin import firestore
import datetime
import uuid

db = firestore.client()
app_bp = Blueprint('app_bp', __name__)

# --- HELPERS & DECORATORS ---
def is_owner(user_id):
    user_doc = db.collection('users').document(user_id).get()
    return user_doc.exists and user_doc.to_dict().get('is_owner', False)

def check_banned(user_id):
    user_doc = db.collection('users').document(user_id).get()
    return user_doc.exists and user_doc.to_dict().get('is_banned', False)

# --- PUBLIC CHAT ROUTES ---
@app_bp.route('/chat/public', methods=['GET', 'POST'])
def public_chat():
    user_id = session.get('user_id')
    if not user_id:
        return redirect(url_for('login'))
    if check_banned(user_id):
        return "Ang iyong account ay kasalukuyang naka-ban.", 403

    if request.method == 'POST':
        content = request.form.get('content')
        user_doc = db.collection('users').document(user_id).get().to_dict()
        
        db.collection('public_messages').add({
            'sender_id': user_id,
            'sender_name': user_doc.get('username', 'Anonymous'),
            'content': content,
            'timestamp': datetime.datetime.utcnow()
        })
        return jsonify({'status': 'success'})

    messages = db.collection('public_messages').order_by('timestamp').limit(50).stream()
    return render_template('public_chat.html', messages=[m.to_dict() for m in messages])

# --- PRIVATE MESSAGES ---
@app_bp.route('/chat/private/<receiver_id>', methods=['GET', 'POST'])
def private_chat(receiver_id):
    user_id = session.get('user_id')
    if not user_id or check_banned(user_id):
        return "Unauthorized", 403

    if request.method == 'POST':
        content = request.form.get('content')
        db.collection('private_messages').add({
            'sender_id': user_id,
            'receiver_id': receiver_id,
            'content': content,
            'timestamp': datetime.datetime.utcnow()
        })
        return jsonify({'status': 'sent'})

    # Fetch conversation between two users
    msgs = db.collection('private_messages').where('sender_id', 'in', [user_id, receiver_id]).stream()
    filtered_msgs = [
        m.to_dict() for m in msgs 
        if (m.to_dict()['sender_id'] == user_id and m.to_dict()['receiver_id'] == receiver_id) or
           (m.to_dict()['sender_id'] == receiver_id and m.to_dict()['receiver_id'] == user_id)
    ]
    return render_template('private_chat.html', messages=filtered_msgs)

# --- PROFILE EDITING ---
@app_bp.route('/profile/edit', methods=['POST'])
def update_profile():
    user_id = session.get('user_id')
    new_name = request.form.get('username')
    avatar_url = request.form.get('avatar_url')

    db.collection('users').document(user_id).update({
        'username': new_name,
        'avatar_url': avatar_url
    })
    return jsonify({'status': 'profile updated'})

# --- REDEEM NEO PRO CODE ---
@app_bp.route('/redeem-pro', methods=['POST'])
def redeem_code():
    user_id = session.get('user_id')
    input_code = request.form.get('code')

    code_ref = db.collection('pro_codes').where('code', '==', input_code).where('is_used', '==', False).limit(1).stream()
    code_docs = list(code_ref)

    if not code_docs:
        return jsonify({'error': 'Invalid or already used code'}), 400

    # Mark code as used and upgrade user
    code_id = code_docs[0].id
    db.collection('pro_codes').document(code_id).update({'is_used': True, 'used_by': user_id})
    db.collection('users').document(user_id).update({'is_pro': True})

    return jsonify({'status': 'Upgraded to NEO Pro successfully!'})

# --- OWNER ADMIN PANEL ---
@app_bp.route('/admin/generate-code', methods=['POST'])
def generate_pro_code():
    user_id = session.get('user_id')
    if not is_owner(user_id):
        return "Access Denied: Owner Only", 403

    new_code = "NEO-" + str(uuid.uuid4())[:8].upper()
    db.collection('pro_codes').add({
        'code': new_code,
        'is_used': False,
        'created_by': user_id
    })
    return jsonify({'generated_code': new_code})

@app_bp.route('/admin/ban-user', methods=['POST'])
def ban_user():
    user_id = session.get('user_id')
    if not is_owner(user_id):
        return "Access Denied: Owner Only", 403

    target_user_id = request.form.get('target_user_id')
    db.collection('users').document(target_user_id).update({'is_banned': True})
    return jsonify({'status': f'User {target_user_id} banned successfully'})

@app_bp.route('/admin/give-pro', methods=['POST'])
def give_pro_direct():
    user_id = session.get('user_id')
    if not is_owner(user_id):
        return "Access Denied: Owner Only", 403

    target_user_id = request.form.get('target_user_id')
    db.collection('users').document(target_user_id).update({'is_pro': True})
    return jsonify({'status': 'NEO Pro granted'})
