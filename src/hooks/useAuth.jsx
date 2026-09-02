import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  // Track Firebase Auth session
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setFirebaseUser(u));
  }, []);

  // Live-subscribe to this user's Firestore profile doc
  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }
    const ref = doc(db, "users", firebaseUser.uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
    });
  }, [firebaseUser]);

  const signup = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      bio: "",
      premium: false,
      friends: 0,
      followers: 0,
      createdAt: serverTimestamp(),
    });
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  const updateMyProfile = async (fields) => {
    if (!firebaseUser) return;
    await updateDoc(doc(db, "users", firebaseUser.uid), fields);
  };

  const value = {
    firebaseUser,
    profile,
    loading: firebaseUser === undefined,
    signup,
    login,
    logout,
    updateMyProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
