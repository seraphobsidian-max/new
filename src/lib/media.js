import { collection, getDocs, limit as fsLimit, query, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase.js";

// Firestore doesn't do case-insensitive "contains" search natively.
// For a real app, use a search service (Algolia, Typesense, Meilisearch).
// For this prototype, we fetch a batch of users and filter client-side.
export async function searchUsers(term) {
  if (!term.trim()) return [];
  const snap = await getDocs(query(collection(db, "users"), fsLimit(50)));
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const lower = term.toLowerCase();
  return all.filter((u) => u.name?.toLowerCase().includes(lower));
}

export async function uploadMedia(file, uid) {
  const path = `posts/${uid}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const mediaType = file.type.startsWith("video") ? "video" : "photo";
  return { url, mediaType };
}
