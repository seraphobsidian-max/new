import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";

export function subscribeToNotifications(uid, callback) {
  if (!uid) return () => {};
  const q = query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createNotification(recipientUid, { actor, text }) {
  await addDoc(collection(db, "users", recipientUid, "notifications"), {
    actor,
    text,
    createdAt: serverTimestamp(),
  });
}
