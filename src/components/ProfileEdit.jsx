import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function ProfileEdit({ currentUser, userData }) {
  const [username, setUsername] = useState(userData?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(userData?.avatar_url || '');
  const [proCode, setProCode] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, 'users', currentUser.uid), {
      username: username,
      avatar_url: avatarUrl
    });
    setStatusMsg('Profile updated successfully!');
  };

  const handleRedeemCode = async (e) => {
    e.preventDefault();
    if (!proCode.trim()) return;

    const q = query(collection(db, 'pro_codes'), where('code', '==', proCode.trim()), where('is_used', '==', false));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      setStatusMsg('Invalid or used NEO Pro code.');
      return;
    }

    const codeDoc = querySnapshot.docs[0];
    await updateDoc(doc(db, 'pro_codes', codeDoc.id), { is_used: true, used_by: currentUser.uid });
    await updateDoc(doc(db, 'users', currentUser.uid), { is_pro: true });

    setStatusMsg('🎉 Congratulations! NEO Pro unlocked.');
    setProCode('');
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-lg border border-slate-800 space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-3">✏️ Edit Profile</h3>
        <form onSubmit={handleUpdateProfile} className="space-y-3">
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Username" 
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
          />
          <input 
            type="text" 
            value={avatarUrl} 
            onChange={(e) => setAvatarUrl(e.target.value)} 
            placeholder="Avatar Image URL" 
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
          />
          <button type="submit" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm font-semibold w-full">Save Profile</button>
        </form>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <h3 className="text-lg font-bold mb-3">⭐ Redeem NEO Pro</h3>
        <form onSubmit={handleRedeemCode} className="flex gap-2">
          <input 
            type="text" 
            value={proCode} 
            onChange={(e) => setProCode(e.target.value)} 
            placeholder="Enter NEO Pro Code" 
            className="flex-1 bg-slate-800 border border-slate-700 rounded p-2 text-sm"
          />
          <button type="submit" className="bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded text-sm font-semibold text-black">Redeem</button>
        </form>
      </div>

      {statusMsg && <p className="text-xs text-center text-purple-400 mt-2">{statusMsg}</p>}
    </div>
  );
}
