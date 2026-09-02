import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Register User
export const registerUser = async (email, password, username) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName: username });

  // Tiyakin kung owner si 'sinzuntriad'
  const isOwner = username.toLowerCase() === 'sinzuntriad';

  // I-save sa Firestore Database
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    username: username,
    email: email,
    avatar_url: '',
    is_owner: isOwner,
    is_pro: false,
    is_banned: false,
    created_at: new Date()
  });

  return user;
};

// Login User
export const loginUser = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

// Logout User
export const logoutUser = async () => {
  return await signOut(auth);
};

// Kunin ang User Profile Data sa Firestore
export const getUserProfile = async (uid) => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};
