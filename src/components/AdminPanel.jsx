import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminPanel({ currentUser, isOwner }) {
  const [targetUid, setTargetUid] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [msg, setMsg] = useState('');

  if (!isOwner) {
    return null; // Tanging si Owner lang ang makakakita nito
  }

  const handleGenerateCode = async () => {
    const newCode = "NEO-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    await addDoc(collection(db, 'pro_codes'), {
      code: newCode,
      is_used: false,
      created_by: currentUser.uid,
      created_at: serverTimestamp()
    });
    setGeneratedCode(newCode);
  };

  const handleBanUser = async () => {
    if (!targetUid.trim()) return;
    await updateDoc(doc(db, 'users', targetUid.trim()), { is_banned: true });
    setMsg(`User ${targetUid} has been banned.`);
    setTargetUid('');
  };

  const handleGivePro = async () => {
    if (!targetUid.trim()) return;
    await updateDoc(doc(db, 'users', targetUid.trim()), { is_pro: true });
    setMsg(`NEO Pro granted to user ${targetUid}.`);
    setTargetUid('');
  };

  return (
    <div className="bg-red-950/40 border border-red-800 text-white p-6 rounded-lg space-y-4">
      <h3 className="text-lg font-bold text-red-400">👑 Owner Admin Control</h3>
      
      <div className="space-y-2">
        <button onClick={handleGenerateCode} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-semibold w-full">
          Generate NEO Pro Code
        </button>
        {generatedCode && (
          <p className="text-sm bg-slate-900 p-2 rounded text-center border border-slate-700 font-mono">
            Code: <span className="text-amber-400 font-bold">{generatedCode}</span>
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-red-900/50 pt-3">
        <input 
          type="text" 
          value={targetUid} 
          onChange={(e) => setTargetUid(e.target.value)} 
          placeholder="Target User UID" 
          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
        />
        <div className="flex gap-2">
          <button onClick={handleGivePro} className="flex-1 bg-amber-600 hover:bg-amber-700 p-2 rounded text-xs font-semibold">Give NEO Pro</button>
          <button onClick={handleBanUser} className="flex-1 bg-red-700 hover:bg-red-800 p-2 rounded text-xs font-semibold">Ban User</button>
        </div>
      </div>

      {msg && <p className="text-xs text-red-300 text-center">{msg}</p>}
    </div>
  );
}
