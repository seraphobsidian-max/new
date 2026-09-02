import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { createNotification } from "./notifications.js";

const postsCol = collection(db, "posts");

export function subscribeToPosts(callback) {
  const q = query(postsCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createPost({ authorId, authorName, authorPremium, text, mediaUrl, mediaType }) {
  await addDoc(postsCol, {
    authorId,
    authorName,
    authorPremium,
    text,
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || null,
    likes: [],
    comments: [],
    createdAt: serverTimestamp(),
  });
}

export async function toggleLike(post, uid, likerName) {
  const ref = doc(db, "posts", post.id);
  const alreadyLiked = post.likes?.includes(uid);
  await updateDoc(ref, {
    likes: alreadyLiked ? arrayRemove(uid) : arrayUnion(uid),
  });
  if (!alreadyLiked && post.authorId !== uid) {
    await createNotification(post.authorId, { actor: likerName, text: "liked your post" });
  }
}

export async function addComment(post, { authorId, authorName, text }) {
  const ref = doc(db, "posts", post.id);
  await updateDoc(ref, {
    // Comments are stored as a plain array on the post doc for simplicity.
    // For a high-traffic app, move this to a subcollection instead.
    comments: arrayUnion({ authorId, authorName, text, createdAt: Date.now() }),
  });
  if (post.authorId !== authorId) {
    await createNotification(post.authorId, { actor: authorName, text: "commented on your post" });
  }
}
