import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function PublicChat({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'public_messages'), orderBy('timestamp', 'asc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    await addDoc(collection(db, 'public_messages'), {
      sender_id: currentUser.uid,
      sender_name: currentUser.displayName || 'Anonymous',
      content: text,
      timestamp: serverTimestamp()
    });
    setText('');
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-900 text-white rounded-lg p-4 border border-slate-800">
      <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">🌐 Public Chat</h2>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`p-2 rounded max-w-[80%] ${msg.sender_id === currentUser.uid ? 'ml-auto bg-purple-600' : 'bg-slate-800'}`}>
            <p className="text-xs text-slate-400 font-semibold">{msg.sender_name}</p>
            <p className="text-sm">{msg.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input 
          type="text" 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          placeholder="Type a message..." 
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
        />
        <button type="submit" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm font-semibold">Send</button>
      </form>
    </div>
  );
  }
