import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function PrivateChat({ currentUser, targetUserId, targetUserName }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!targetUserId) return;
    const q = query(collection(db, 'private_messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filtered = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(m => (m.sender_id === currentUser.uid && m.receiver_id === targetUserId) ||
                     (m.sender_id === targetUserId && m.receiver_id === currentUser.uid));
      setMessages(filtered);
    });
    return () => unsubscribe();
  }, [targetUserId, currentUser.uid]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !targetUserId) return;

    await addDoc(collection(db, 'private_messages'), {
      sender_id: currentUser.uid,
      receiver_id: targetUserId,
      content: text,
      timestamp: serverTimestamp()
    });
    setText('');
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-900 text-white rounded-lg p-4 border border-slate-800">
      <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">🔒 Private Chat ({targetUserName || 'Select User'})</h2>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`p-2 rounded max-w-[80%] ${msg.sender_id === currentUser.uid ? 'ml-auto bg-blue-600' : 'bg-slate-800'}`}>
            <p className="text-sm">{msg.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input 
          type="text" 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          placeholder="Private message..." 
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold">Send</button>
      </form>
    </div>
  );
      }
