import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';

// Magpadala ng Public Message
export const sendPublicMessage = async (userId, username, text) => {
  if (!text.trim()) return;
  await addDoc(collection(db, 'public_messages'), {
    sender_id: userId,
    sender_name: username,
    content: text,
    timestamp: serverTimestamp()
  });
};

// Magpadala ng Private Message
export const sendPrivateMessage = async (senderId, receiverId, text) => {
  if (!text.trim()) return;
  await addDoc(collection(db, 'private_messages'), {
    sender_id: senderId,
    receiver_id: receiverId,
    content: text,
    timestamp: serverTimestamp()
  });
};

// Real-time listener para sa Public Chat
export const listenToPublicChat = (callback) => {
  const q = query(collection(db, 'public_messages'), orderBy('timestamp', 'asc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
};
