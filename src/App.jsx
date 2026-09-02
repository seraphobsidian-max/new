import React, { useEffect, useMemo, useState } from "react";
import {
  Home, Search, Bell, User, Plus, Heart, MessageCircle, Share2,
  Image as ImageIcon, Video, LogOut, Sparkles, Crown,
  X, ChevronLeft, Check, Camera, Pencil, Mail, Lock, UserPlus, Loader2,
} from "lucide-react";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import { addComment, createPost, subscribeToPosts, toggleLike } from "./lib/posts.js";
import { subscribeToNotifications } from "./lib/notifications.js";
import { searchUsers, uploadMedia } from "./lib/media.js";
import { subscribeToUserProfile } from "./lib/users.js";

// ---------------------------------------------------------------------------
// NEO SOCIALS — now backed by Firebase (Auth + Firestore + Storage).
// Design tokens live in the <style> block at the bottom of this file.
// ---------------------------------------------------------------------------

const PALETTE = ["#8B5CF6", "#22D3EE", "#F97066", "#34D399", "#F5B942", "#60A5FA"];

function hashName(name = "?") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

function timeAgo(ts) {
  if (!ts) return "just now";
  const ms = typeof ts === "number" ? ts : ts.toMillis?.() ?? Date.now();
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ name, size = 40, premium, src }) {
  const color = PALETTE[hashName(name) % PALETTE.length];
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className={"neo-avatar" + (premium ? " neo-avatar--premium" : "")} style={{ width: size, height: size }}>
      <div
        className="neo-avatar__inner"
        style={{
          width: size - (premium ? 6 : 0),
          height: size - (premium ? 6 : 0),
          background: src ? `center/cover url(${src})` : color,
          fontSize: size * 0.38,
        }}
      >
        {!src && initials}
      </div>
    </div>
  );
}

function NeoLogo({ size = 22 }) {
  return (
    <div className="neo-logo" style={{ fontSize: size }}>
      <span className="neo-logo__mark">N</span>
      <span>EO</span>
    </div>
  );
}

function UsernameLabel({ name, premium, size = 15 }) {
  return (
    <span className={"neo-username" + (premium ? " neo-username--rgb" : "")} style={{ fontSize: size }}>
      {name}
      {premium && <Crown size={size * 0.8} className="neo-badge-icon" />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function AuthScreen() {
  const { signup, login } = useAuth();
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "signup" && !name.trim()) return setError("Tell us your name first.");
    if (!email.trim().includes("@")) return setError("That email doesn't look right.");
    if (password.length < 6) return setError("Password needs at least 6 characters.");

    setBusy(true);
    try {
      if (mode === "signup") {
        await signup(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="neo-screen neo-auth">
      <div className="neo-auth__hero">
        <NeoLogo size={34} />
        <p className="neo-auth__tag">your feed, your frequency</p>
      </div>

      <div className="neo-auth__card">
        <div className="neo-tabbar">
          <button className={"neo-tab" + (mode === "signup" ? " neo-tab--active" : "")} onClick={() => setMode("signup")}>
            Create account
          </button>
          <button className={"neo-tab" + (mode === "login" ? " neo-tab--active" : "")} onClick={() => setMode("login")}>
            Log in
          </button>
        </div>

        <form onSubmit={submit} className="neo-form">
          {mode === "signup" && (
            <label className="neo-field">
              <UserPlus size={16} />
              <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="neo-field">
            <Mail size={16} />
            <input placeholder="Gmail or email address" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>
          <label className="neo-field">
            <Lock size={16} />
            <input placeholder="Password (min 6 characters)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <div className="neo-error">{error}</div>}

          <button className="neo-btn neo-btn--primary" type="submit" disabled={busy}>
            {busy ? <Loader2 size={16} className="neo-spin-icon" /> : mode === "signup" ? "Create my NEO account" : "Log in"}
          </button>
        </form>
        <p className="neo-auth__fine">
          Real accounts now — powered by Firebase Auth. Your email/password never touches anything but Firebase.
        </p>
      </div>
    </div>
  );
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use")) return "That email already has an account — try logging in.";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential"))
    return "Email or password is incorrect.";
  if (code.includes("weak-password")) return "Password needs at least 6 characters.";
  return "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

function Composer({ profile, uid, onPosted }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  const submit = async () => {
    if (!text.trim() && !file) return;
    setUploading(true);
    try {
      let mediaUrl = null;
      let mediaType = null;
      if (file) {
        const uploaded = await uploadMedia(file, uid);
        mediaUrl = uploaded.url;
        mediaType = uploaded.mediaType;
      }
      await createPost({
        authorId: uid,
        authorName: profile.name,
        authorPremium: !!profile.premium,
        text: text.trim(),
        mediaUrl,
        mediaType,
      });
      setText("");
      clearFile();
      onPosted?.();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="neo-composer">
      <Avatar name={profile.name} premium={profile.premium} size={40} />
      <div className="neo-composer__body">
        <textarea
          placeholder={`What's on your mind, ${profile.name?.split(" ")[0] || ""}?`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />
        {preview && (
          <div className="neo-media-preview">
            {file.type.startsWith("video") ? (
              <video src={preview} className="neo-media-preview__el" controls />
            ) : (
              <img src={preview} className="neo-media-preview__el" alt="upload preview" />
            )}
            <button onClick={clearFile} aria-label="Remove media">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="neo-composer__row">
          <div className="neo-composer__actions">
            <label className="neo-chip">
              <ImageIcon size={15} /> Photo/Video
              <input type="file" accept="image/*,video/*" onChange={pickFile} hidden />
            </label>
          </div>
          <button className="neo-btn neo-btn--small" onClick={submit} disabled={uploading}>
            {uploading ? <Loader2 size={14} className="neo-spin-icon" /> : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post card
// ---------------------------------------------------------------------------

function PostCard({ post, myUid, myName, onOpenProfile }) {
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const liked = post.likes?.includes(myUid);

  return (
    <article className="neo-post">
      <header className="neo-post__head" onClick={() => onOpenProfile(post.authorId)}>
        <Avatar name={post.authorName} premium={post.authorPremium} size={38} />
        <div>
          <UsernameLabel name={post.authorName} premium={post.authorPremium} />
          <div className="neo-post__meta">{timeAgo(post.createdAt)}</div>
        </div>
      </header>

      {post.text && <p className="neo-post__text">{post.text}</p>}

      {post.mediaUrl && (
        <div className="neo-media-real">
          {post.mediaType === "video" ? (
            <video src={post.mediaUrl} controls className="neo-media-real__el" />
          ) : (
            <img src={post.mediaUrl} className="neo-media-real__el" alt="post attachment" />
          )}
        </div>
      )}

      <div className="neo-post__stats">
        <span>{post.likes?.length || 0} likes</span>
        <span>{post.comments?.length || 0} comments</span>
      </div>

      <div className="neo-post__actions">
        <button
          className={"neo-post__action" + (liked ? " neo-post__action--active" : "")}
          onClick={() => toggleLike(post, myUid, myName)}
        >
          <Heart size={17} fill={liked ? "currentColor" : "none"} /> Like
        </button>
        <button className="neo-post__action" onClick={() => setShowComments((s) => !s)}>
          <MessageCircle size={17} /> Comment
        </button>
        <button className="neo-post__action">
          <Share2 size={17} /> Share
        </button>
      </div>

      {showComments && (
        <div className="neo-comments">
          {(post.comments || []).map((c, i) => (
            <div className="neo-comment" key={i}>
              <Avatar name={c.authorName} size={26} />
              <div className="neo-comment__bubble">
                <strong>{c.authorName}</strong>
                <span>{c.text}</span>
              </div>
            </div>
          ))}
          <form
            className="neo-comment__form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!commentText.trim()) return;
              addComment(post, { authorId: myUid, authorName: myName, text: commentText.trim() });
              setCommentText("");
            }}
          >
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment…" />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

function FeedScreen({ posts, profile, uid, onOpenProfile }) {
  return (
    <div className="neo-feed">
      <Composer profile={profile} uid={uid} />
      {posts.length === 0 && <div className="neo-empty">No posts yet — be the first to share something.</div>}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} myUid={uid} myName={profile.name} onOpenProfile={onOpenProfile} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

function ProfileScreen({ profileUser, isSelf, posts, onUpdate, onTogglePremium, onBack }) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profileUser.bio || "");
  const [name, setName] = useState(profileUser.name || "");

  const save = async () => {
    await onUpdate({ name: name.trim() || profileUser.name, bio });
    setEditing(false);
  };

  return (
    <div className="neo-screen">
      {onBack && (
        <button className="neo-backbtn" onClick={onBack}>
          <ChevronLeft size={18} /> Back
        </button>
      )}

      <div
        className={"neo-banner" + (profileUser.premium ? " neo-banner--premium" : "")}
        style={{ background: profileUser.premium ? undefined : `${PALETTE[hashName(profileUser.name) % PALETTE.length]}33` }}
      >
        {isSelf && (
          <button className="neo-banner__edit" title="Change banner (upload a photo post to customize soon)">
            <Camera size={15} />
          </button>
        )}
      </div>

      <div className="neo-profile__head">
        <Avatar name={profileUser.name} premium={profileUser.premium} size={78} />
        <div className="neo-profile__id">
          {editing ? (
            <input className="neo-inline-input" value={name} onChange={(e) => setName(e.target.value)} />
          ) : (
            <UsernameLabel name={profileUser.name} premium={profileUser.premium} size={19} />
          )}
          <div className="neo-profile__handle">@{profileUser.email?.split("@")[0]}</div>
        </div>
      </div>

      {editing ? (
        <textarea className="neo-bio-input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write something about yourself…" rows={3} />
      ) : (
        <p className="neo-profile__bio">{profileUser.bio || (isSelf ? "Add a bio to tell people about yourself." : "")}</p>
      )}

      <div className="neo-profile__stats">
        <div><strong>{posts.length}</strong><span>Posts</span></div>
        <div><strong>{profileUser.friends || 0}</strong><span>Friends</span></div>
        <div><strong>{profileUser.followers || 0}</strong><span>Followers</span></div>
      </div>

      {isSelf && (
        <div className="neo-profile__buttons">
          {editing ? (
            <>
              <button className="neo-btn neo-btn--primary neo-btn--small" onClick={save}>
                <Check size={15} /> Save
              </button>
              <button className="neo-btn neo-btn--ghost neo-btn--small" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="neo-btn neo-btn--ghost neo-btn--small" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit profile
            </button>
          )}
        </div>
      )}

      {isSelf && (
        <button className={"neo-premium-card" + (profileUser.premium ? " neo-premium-card--active" : "")} onClick={onTogglePremium}>
          <Sparkles size={20} />
          <div>
            <div className="neo-premium-card__title">{profileUser.premium ? "NEO Premium is active" : "Go NEO Premium"}</div>
            <div className="neo-premium-card__sub">
              {profileUser.premium ? "Tap to turn off animated profile effects" : "Animated avatar, RGB name, banner frame & higher upload limits"}
            </div>
          </div>
        </button>
      )}

      <div className="neo-profile__section-title">Posts</div>
      <div className="neo-feed neo-feed--nested">
        {posts.length === 0 && <div className="neo-empty">No posts yet.</div>}
        {posts.map((p) => (
          <div className="neo-post neo-post--compact" key={p.id}>
            {p.text && <p className="neo-post__text">{p.text}</p>}
            {p.mediaUrl && (
              <div className="neo-media-real">
                {p.mediaType === "video" ? <video src={p.mediaUrl} controls className="neo-media-real__el" /> : <img src={p.mediaUrl} className="neo-media-real__el" alt="" />}
              </div>
            )}
            <div className="neo-post__stats">
              <span>{p.likes?.length || 0} likes</span>
              <span>{p.comments?.length || 0} comments</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function NotificationsScreen({ notifications }) {
  return (
    <div className="neo-screen">
      <h2 className="neo-screen__title">Notifications</h2>
      {notifications.length === 0 && <div className="neo-empty">You're all caught up.</div>}
      <div className="neo-notif-list">
        {notifications.map((n) => (
          <div className="neo-notif" key={n.id}>
            <Avatar name={n.actor} size={36} />
            <div className="neo-notif__body">
              <span><strong>{n.actor}</strong> {n.text}</span>
              <div className="neo-post__meta">{timeAgo(n.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function SearchScreen({ posts, onOpenProfile }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      searchUsers(q).then((res) => {
        setUsers(res);
        setLoading(false);
      });
    }, 250); // debounce
    return () => clearTimeout(t);
  }, [q]);

  const matchedPosts = useMemo(
    () => (q.trim() ? posts.filter((p) => p.text?.toLowerCase().includes(q.toLowerCase())) : []),
    [q, posts]
  );

  return (
    <div className="neo-screen">
      <label className="neo-field neo-field--search">
        <Search size={16} />
        <input placeholder="Search people or posts" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {q.trim() === "" ? (
        <div className="neo-empty">Search for people or something someone posted.</div>
      ) : (
        <>
          <div className="neo-profile__section-title">People {loading && <Loader2 size={12} className="neo-spin-icon" />}</div>
          {!loading && users.length === 0 && <div className="neo-empty">No people found.</div>}
          {users.map((u) => (
            <button className="neo-userrow" key={u.id} onClick={() => onOpenProfile(u.id)}>
              <Avatar name={u.name} premium={u.premium} size={40} />
              <div>
                <UsernameLabel name={u.name} premium={u.premium} />
                <div className="neo-post__meta">@{u.email?.split("@")[0]}</div>
              </div>
            </button>
          ))}

          <div className="neo-profile__section-title">Posts</div>
          {matchedPosts.length === 0 && <div className="neo-empty">No posts found.</div>}
          {matchedPosts.map((p) => (
            <div className="neo-post neo-post--compact" key={p.id}>
              <header className="neo-post__head">
                <Avatar name={p.authorName} premium={p.authorPremium} size={30} />
                <UsernameLabel name={p.authorName} premium={p.authorPremium} size={14} />
              </header>
              <p className="neo-post__text">{p.text}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App shell (needs an authenticated profile)
// ---------------------------------------------------------------------------

function AppShell() {
  const { firebaseUser, profile, logout, updateMyProfile } = useAuth();
  const [tab, setTab] = useState("home");
  const [viewedProfileId, setViewedProfileId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [viewedProfile, setViewedProfile] = useState(null);

  useEffect(() => subscribeToPosts(setPosts), []);
  useEffect(() => subscribeToNotifications(firebaseUser?.uid, setNotifications), [firebaseUser?.uid]);
  useEffect(() => subscribeToUserProfile(viewedProfileId, setViewedProfile), [viewedProfileId]);

  if (!profile) {
    return (
      <div className="neo-screen neo-loading">
        <Loader2 size={22} className="neo-spin-icon" />
        <span>Setting up your profile…</span>
      </div>
    );
  }

  const openProfile = (uid) => {
    setViewedProfileId(uid === firebaseUser.uid ? null : uid);
    setTab("profile");
  };

  const profileTarget = viewedProfileId && viewedProfile
    ? { id: viewedProfileId, ...viewedProfile }
    : { id: firebaseUser.uid, ...profile };

  const profilePosts = posts.filter((p) => p.authorId === profileTarget.id);
  const isSelf = profileTarget.id === firebaseUser.uid;

  return (
    <div className="neo-app">
      <header className="neo-header">
        <NeoLogo />
        <div className="neo-header__icons">
          <button onClick={() => setTab("search")} aria-label="Search"><Search size={19} /></button>
          <button onClick={() => setTab("notifications")} aria-label="Notifications"><Bell size={19} /></button>
          <button onClick={logout} aria-label="Sign out"><LogOut size={19} /></button>
        </div>
      </header>

      <main className="neo-main">
        {tab === "home" && (
          <FeedScreen posts={posts} profile={profile} uid={firebaseUser.uid} onOpenProfile={openProfile} />
        )}
        {tab === "search" && <SearchScreen posts={posts} onOpenProfile={openProfile} />}
        {tab === "notifications" && <NotificationsScreen notifications={notifications} />}
        {tab === "profile" && (
          <ProfileScreen
            profileUser={profileTarget}
            isSelf={isSelf}
            posts={profilePosts}
            onUpdate={updateMyProfile}
            onTogglePremium={() => updateMyProfile({ premium: !profile.premium })}
            onBack={viewedProfileId ? () => setViewedProfileId(null) : null}
          />
        )}
      </main>

      <nav className="neo-bottomnav">
        <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}>
          <Home size={20} /><span>Home</span>
        </button>
        <button className={tab === "search" ? "active" : ""} onClick={() => setTab("search")}>
          <Search size={20} /><span>Search</span>
        </button>
        <button className="neo-bottomnav__post" onClick={() => setTab("home")} aria-label="New post">
          <Plus size={20} />
        </button>
        <button className={tab === "notifications" ? "active" : ""} onClick={() => setTab("notifications")}>
          <Bell size={20} /><span>Alerts</span>
        </button>
        <button
          className={tab === "profile" ? "active" : ""}
          onClick={() => {
            setViewedProfileId(null);
            setTab("profile");
          }}
        >
          <User size={20} /><span>Profile</span>
        </button>
      </nav>
    </div>
  );
}

function Gate() {
  const { firebaseUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="neo-app">
        <div className="neo-screen neo-loading">
          <Loader2 size={22} className="neo-spin-icon" />
        </div>
        <style>{STYLE}</style>
      </div>
    );
  }
  return (
    <div className="neo-app">
      {firebaseUser ? <AppShell /> : <AuthScreen />}
      <style>{STYLE}</style>
    </div>
  );
}

export default function NeoSocials() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.neo-app {
  --void: #0A0C16;
  --surface: #12162A;
  --surface-alt: #1A1F3B;
  --border: #262B4A;
  --violet: #8B5CF6;
  --cyan: #22D3EE;
  --text: #F1F0FA;
  --muted: #8B90B3;
  --gold: #F5B942;
  --pink: #FF5FA2;

  font-family: 'Inter', sans-serif;
  background: var(--void);
  color: var(--text);
  max-width: 430px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

.neo-app * { box-sizing: border-box; }
.neo-app button { font-family: inherit; cursor: pointer; }
.neo-app input, .neo-app textarea { font-family: inherit; }

.neo-logo { font-family: 'Space Grotesk', sans-serif; font-weight: 700; letter-spacing: 0.02em; display: flex; align-items: baseline; gap: 1px; }
.neo-logo__mark { background: linear-gradient(135deg, var(--violet), var(--cyan)); -webkit-background-clip: text; background-clip: text; color: transparent; }

.neo-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: rgba(10,12,22,0.92); backdrop-filter: blur(8px); z-index: 5; }
.neo-header__icons { display: flex; gap: 16px; }
.neo-header__icons button { background: none; border: none; color: var(--muted); display: flex; }
.neo-header__icons button:hover { color: var(--text); }

.neo-main { flex: 1; overflow-y: auto; padding-bottom: 84px; }
.neo-screen { padding: 16px; }
.neo-screen__title { font-family: 'Space Grotesk', sans-serif; font-size: 20px; margin: 4px 0 16px; }
.neo-loading { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 60vh; color: var(--muted); }

@keyframes neo-spin-anim { to { transform: rotate(360deg); } }
.neo-spin-icon { animation: neo-spin-anim 0.9s linear infinite; }

/* Auth */
.neo-auth { display: flex; flex-direction: column; min-height: 100vh; justify-content: center; padding: 32px 20px; }
.neo-auth__hero { text-align: center; margin-bottom: 28px; }
.neo-auth__hero .neo-logo { justify-content: center; font-size: 34px; }
.neo-auth__tag { color: var(--muted); margin-top: 6px; font-size: 13px; letter-spacing: 0.02em; }
.neo-auth__card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 18px; }
.neo-auth__fine { color: var(--muted); font-size: 11px; margin-top: 14px; text-align: center; line-height: 1.5; }

.neo-tabbar { display: flex; background: var(--surface-alt); border-radius: 10px; padding: 3px; margin-bottom: 16px; }
.neo-tab { flex: 1; background: none; border: none; color: var(--muted); padding: 9px; border-radius: 8px; font-size: 13px; font-weight: 600; }
.neo-tab--active { background: var(--violet); color: white; }

.neo-form { display: flex; flex-direction: column; gap: 10px; }
.neo-field { display: flex; align-items: center; gap: 8px; background: var(--void); border: 1px solid var(--border); border-radius: 10px; padding: 11px 12px; color: var(--muted); }
.neo-field input { flex: 1; background: none; border: none; outline: none; color: var(--text); font-size: 14px; }
.neo-field--search { margin-bottom: 16px; }
.neo-error { color: var(--pink); font-size: 12px; }

.neo-btn { border: none; border-radius: 10px; padding: 11px 16px; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.neo-btn:disabled { opacity: 0.6; }
.neo-btn--primary { background: linear-gradient(135deg, var(--violet), #6D3FE0); color: white; }
.neo-btn--ghost { background: var(--surface-alt); color: var(--text); border: 1px solid var(--border); }
.neo-btn--small { padding: 7px 12px; font-size: 12.5px; }

/* Composer */
.neo-composer { display: flex; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 12px; margin-bottom: 14px; }
.neo-composer__body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.neo-composer textarea { background: none; border: none; outline: none; color: var(--text); resize: none; font-size: 14px; line-height: 1.4; }
.neo-composer__row { display: flex; align-items: center; justify-content: space-between; }
.neo-composer__actions { display: flex; gap: 8px; }
.neo-chip { display: flex; align-items: center; gap: 5px; background: var(--surface-alt); border: 1px solid var(--border); color: var(--muted); border-radius: 20px; padding: 5px 10px; font-size: 12px; }

.neo-media-preview { position: relative; border-radius: 10px; overflow: hidden; max-height: 200px; }
.neo-media-preview__el { width: 100%; max-height: 200px; object-fit: cover; display: block; }
.neo-media-preview button { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.55); border: none; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }

.neo-media-real { border-radius: 10px; overflow: hidden; margin-bottom: 10px; }
.neo-media-real__el { width: 100%; max-height: 320px; object-fit: cover; display: block; }

/* Feed / posts */
.neo-feed { display: flex; flex-direction: column; gap: 14px; }
.neo-feed--nested { gap: 10px; }
.neo-post { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px; }
.neo-post--compact { padding: 12px; }
.neo-post__head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; cursor: pointer; }
.neo-post__meta { color: var(--muted); font-size: 11.5px; margin-top: 1px; }
.neo-post__text { font-size: 14px; line-height: 1.5; margin: 0 0 10px; white-space: pre-wrap; }
.neo-post__stats { display: flex; gap: 14px; color: var(--muted); font-size: 12px; padding: 8px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-bottom: 6px; }
.neo-post__actions { display: flex; }
.neo-post__action { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background: none; border: none; color: var(--muted); padding: 7px; font-size: 13px; border-radius: 8px; }
.neo-post__action:hover { background: var(--surface-alt); }
.neo-post__action--active { color: var(--pink); }

.neo-comments { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.neo-comment { display: flex; gap: 8px; align-items: flex-start; }
.neo-comment__bubble { background: var(--surface-alt); border-radius: 10px; padding: 7px 10px; font-size: 12.5px; display: flex; flex-direction: column; gap: 1px; }
.neo-comment__bubble strong { font-size: 12px; }
.neo-comment__form { display: flex; gap: 8px; margin-top: 4px; }
.neo-comment__form input { flex: 1; background: var(--void); border: 1px solid var(--border); border-radius: 20px; padding: 8px 12px; color: var(--text); font-size: 12.5px; outline: none; }
.neo-comment__form button { background: var(--violet); color: white; border: none; border-radius: 20px; padding: 0 14px; font-size: 12.5px; font-weight: 600; }

/* Avatar */
.neo-avatar { border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.neo-avatar--premium { background: conic-gradient(from 0deg, var(--gold), var(--pink), var(--violet), var(--cyan), var(--gold)); animation: neo-spin 3.5s linear infinite; padding: 2px; }
.neo-avatar__inner { border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; border: 2px solid var(--void); }
@keyframes neo-spin { to { transform: rotate(360deg); } }

/* Username / premium */
.neo-username { font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
.neo-username--rgb { background: linear-gradient(90deg, var(--pink), var(--gold), var(--cyan), var(--violet), var(--pink)); background-size: 300% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: neo-rgb 4s linear infinite; }
@keyframes neo-rgb { to { background-position: 300% center; } }
.neo-badge-icon { color: var(--gold); flex-shrink: 0; }

/* Profile */
.neo-backbtn { display: flex; align-items: center; gap: 4px; background: none; border: none; color: var(--muted); font-size: 13px; margin-bottom: 10px; padding: 0; }
.neo-banner { height: 110px; border-radius: 14px; margin-bottom: -34px; position: relative; }
.neo-banner--premium { background: linear-gradient(120deg, var(--gold), var(--pink), var(--violet)); background-size: 220% 220%; animation: neo-shimmer 6s ease infinite; }
@keyframes neo-shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
.neo-banner__edit { position: absolute; right: 10px; bottom: 10px; background: rgba(0,0,0,0.45); border: none; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
.neo-profile__head { display: flex; align-items: flex-end; gap: 12px; padding: 0 4px; }
.neo-profile__id { padding-bottom: 6px; display: flex; flex-direction: column; gap: 2px; }
.neo-profile__handle { color: var(--muted); font-size: 12.5px; }
.neo-profile__bio { font-size: 13.5px; color: var(--text); margin: 10px 4px 12px; line-height: 1.5; }
.neo-bio-input { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px; color: var(--text); font-size: 13.5px; margin: 10px 0 12px; outline: none; }
.neo-inline-input { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 3px 6px; color: var(--text); font-size: 16px; font-weight: 600; outline: none; }
.neo-profile__stats { display: flex; gap: 22px; padding: 0 4px 14px; border-bottom: 1px solid var(--border); margin-bottom: 14px; }
.neo-profile__stats div { display: flex; flex-direction: column; font-size: 12px; color: var(--muted); }
.neo-profile__stats strong { font-size: 15px; color: var(--text); }
.neo-profile__buttons { display: flex; gap: 8px; padding: 0 4px; margin-bottom: 14px; }
.neo-profile__section-title { font-size: 13px; font-weight: 600; color: var(--muted); margin: 4px 4px 10px; display: flex; align-items: center; gap: 6px; }

.neo-premium-card { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px; margin-bottom: 18px; color: var(--gold); }
.neo-premium-card--active { background: linear-gradient(135deg, rgba(245,185,66,0.14), rgba(255,95,162,0.10)); border-color: var(--gold); }
.neo-premium-card__title { font-weight: 700; font-size: 14px; color: var(--text); }
.neo-premium-card__sub { font-size: 11.5px; color: var(--muted); margin-top: 2px; line-height: 1.4; }

/* Notifications */
.neo-notif-list { display: flex; flex-direction: column; gap: 4px; }
.neo-notif { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid var(--border); color: var(--muted); }
.neo-notif__body { flex: 1; font-size: 13px; color: var(--text); }
.neo-notif__body strong { font-weight: 600; }

/* Search */
.neo-userrow { display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: none; padding: 8px 4px; text-align: left; }
.neo-userrow:hover { background: var(--surface-alt); border-radius: 10px; }

.neo-empty { color: var(--muted); font-size: 13px; padding: 10px 4px 20px; }

/* Bottom nav */
.neo-bottomnav { position: sticky; bottom: 0; display: flex; align-items: center; justify-content: space-around; background: rgba(10,12,22,0.95); backdrop-filter: blur(8px); border-top: 1px solid var(--border); padding: 8px 6px calc(8px + env(safe-area-inset-bottom)); z-index: 5; }
.neo-bottomnav button { background: none; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 10px; padding: 4px 10px; }
.neo-bottomnav button.active { color: var(--cyan); }
.neo-bottomnav__post { background: linear-gradient(135deg, var(--violet), var(--cyan)) !important; color: white !important; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: -18px; box-shadow: 0 4px 14px rgba(139,92,246,0.45); }
`;
