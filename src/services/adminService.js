import { db } from '../firebase';
import { 
  doc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';

// Mag-generate ng NEO Pro Code (Owner Only)
export const generateProCode = async (ownerUid) => {
  const newCode = "NEO-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  await addDoc(collection(db, 'pro_codes'), {
    code: newCode,
    is_used: false,
    created_by: ownerUid,
    created_at: serverTimestamp()
  });
  return newCode;
};

// Mag-redeem ng NEO Pro Code
export const redeemCode = async (userUid, inputCode) => {
  const q = query(
    collection(db, 'pro_codes'), 
    where('code', '==', inputCode.trim()), 
    where('is_used', '==', false)
  );
  
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Invalid or used code.");
  }

  const codeDoc = querySnapshot.docs[0];

  // Mark code as used
  await updateDoc(doc(db, 'pro_codes', codeDoc.id), { 
    is_used: true, 
    used_by: userUid 
  });

  // Upgrade user to NEO Pro
  await updateDoc(doc(db, 'users', userUid), { 
    is_pro: true 
  });

  return true;
};

// Mag-ban ng User (Owner Only)
export const banUser = async (targetUid) => {
  await updateDoc(doc(db, 'users', targetUid), { 
    is_banned: true 
  });
};

// Magbigay ng NEO Pro nang direkta (Owner Only)
export const giveProDirect = async (targetUid) => {
  await updateDoc(doc(db, 'users', targetUid), { 
    is_pro: true 
  });
};
