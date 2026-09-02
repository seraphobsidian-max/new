import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

export function subscribeToUserProfile(uid, callback) {
  if (!uid) return () => {};
  return onSnapshot(doc(db, "users", uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}
