# NEO Socials

A social app front end — accounts, a post feed with likes/comments, photo/video
uploads, profiles, NEO Premium cosmetics (animated avatar ring, RGB username,
shimmer banner, crown badge), notifications, and search — now backed by a real
**Firebase** backend (Auth + Firestore + Storage).

## 1. Create your Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**. Name it (e.g. `neo-socials`) and finish the wizard.
2. In the left sidebar, click **Build → Authentication → Get started**. Under **Sign-in method**, enable **Email/Password**.
3. Click **Build → Firestore Database → Create database**. Start in **production mode**, pick a region close to you.
4. Click **Build → Storage → Get started**. Accept the default rules for now (we'll replace them below).
5. Click the gear icon → **Project settings**. Under **Your apps**, click the `</>` (web) icon, register an app (nickname anything), and copy the `firebaseConfig` object it shows you — you'll need those values next.

## 2. Configure the project locally

```bash
npm install
cp .env.example .env
```

Open `.env` and paste in the values from the `firebaseConfig` object you copied:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=neo-socials-xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=neo-socials-xxxx
VITE_FIREBASE_STORAGE_BUCKET=neo-socials-xxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

`.env` is already in `.gitignore` — don't commit it. `.env.example` (safe, no real keys) is what goes to GitHub instead.

## 3. Apply the security rules

In the Firebase Console:
- **Firestore Database → Rules** — paste in the contents of `firestore.rules` from this repo, then **Publish**.
- **Storage → Rules** — paste in the contents of `storage.rules` from this repo, then **Publish**.

These rules make sure people can only edit their own profile/posts, and can only upload files into their own folder (max 25MB each).

## 4. Run it

```bash
npm run dev
```

Open the local URL Vite prints. Create an account — it's a real Firebase Auth user now, and your profile, posts, likes, comments, and uploaded media all persist in Firestore/Storage.

## What's real now

- **Accounts** — real email/password sign-up and login via Firebase Auth
- **Posts, likes, comments** — stored in Firestore, live-updating across tabs/devices
- **Photo/video uploads** — real files uploaded to Firebase Storage
- **Profile edits & NEO Premium** — persisted to your Firestore user doc
- **Notifications** — created in Firestore when someone likes/comments on your post
- **Search** — queries real user profiles in Firestore (client-side filtered; fine for a small user base — see note below)

## Known limitations / next steps

- **Search** fetches a batch of users and filters in the browser. For a real, larger app, add a dedicated search service (Algolia, Typesense, or Meilisearch) instead.
- **Comments** are stored as an array on each post doc for simplicity. If a post could get hundreds of comments, move them to a subcollection instead.
- **Friends/followers counts** are static placeholders — there's no follow/unfollow flow yet.
- **Banner customization** isn't wired to uploads yet — the "change banner" button is a placeholder.

## Deploying so others can use it (Render — no laptop needed)

This repo includes `render.yaml`, so [Render](https://render.com) can build
and host the web app automatically straight from GitHub — all through a
browser, so this works fully on mobile.

1. Push this project to a GitHub repo (see the GitHub upload steps earlier in this conversation).
2. Go to [render.com](https://render.com) and sign up/log in (you can sign up with your GitHub account directly).
3. Click **New → Blueprint**, then pick the GitHub repo you just pushed. Render will detect `render.yaml` automatically and set up a **Static Site** service named `neo-socials`.
4. Before the first deploy finishes, go to the service's **Environment** tab and fill in the six `VITE_FIREBASE_...` values from your `.env` (the ones from `.env.example` — Render needs its own copy since your local `.env` never leaves your device).
5. Click **Deploy**. When it finishes, Render gives you a live URL like `https://neo-socials.onrender.com` — that's your public web app.

Every time you push new commits to GitHub, Render rebuilds and redeploys automatically.

That live URL is what you'll paste into PWABuilder in the next step to generate the APK.

## Deploying so others can use it (Firebase Hosting — alternative, needs a computer/terminal)

Once you're happy with it, you can deploy the built app for free with **Firebase Hosting**:

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase init hosting   # point it at the "dist" folder, single-page app: yes
firebase deploy
```

## Turning it into an installable Android APK

You have two options depending on whether you're on a computer or on mobile.

### Option A — PWABuilder (works entirely from your phone browser)

Once your app is live on Render (see above), you don't need Android Studio at all:

1. On your phone, go to **pwabuilder.com**.
2. Paste your Render URL (e.g. `https://neo-socials.onrender.com`).
3. Tap **Start** → **Package for stores → Android**.
4. Download the generated `.apk` — that's the file you'll upload to MediaFire.

### Option B — Capacitor + Android Studio (on a computer, more control over the app)

This project already includes `capacitor.config.json` for this path.

1. **Install Android Studio** from [developer.android.com/studio](https://developer.android.com/studio) and let it install the Android SDK on first run.
2. In this project folder, add the Android platform:
   ```bash
   npm run build
   npx cap add android
   npx cap sync android
   ```
3. Open the generated Android project in Android Studio:
   ```bash
   npx cap open android
   ```
4. In Android Studio: **Build → Generate Signed Bundle / APK → APK**. Create a new keystore the first time (save the `.jks` file and its passwords somewhere safe — you'll need the *same* keystore for every future update of this app, or Android will refuse to let people update it). Choose **release** build type.
5. Android Studio outputs the signed `.apk` file under `android/app/release/`. That's the file you'll share.

**A note on the "app might be harmful" warning:** Android shows that warning for *any* APK that isn't from the Play Store or a small list of trusted stores — it's not a sign anything is wrong with your app specifically, it's just how Android treats all outside-the-store installs. There's no legitimate way to make that warning disappear for a MediaFire-hosted file; the real fix, if it matters to you, is publishing to the Google Play Store instead, which removes it for your users.

## Uploading the APK to MediaFire

1. Go to [mediafire.com](https://www.mediafire.com) and sign in (free account is fine).
2. Click **Upload** → **Choose files from computer**, pick your `.apk`.
3. Once it's uploaded, click the file, then **Share** to get a direct download link — that's what you send to people.
4. Anyone who opens the link on Android will see the same "might be harmful" warning mentioned above when they try to install it — that's expected for any APK from outside the Play Store, not something specific to MediaFire.

A couple of things worth knowing before you share it widely:
- **Rename the file to something recognizable** (e.g. `neo-socials-v1.apk`) — generic names make people (rightly) hesitate to install, and are also what malware droppers use to blend in.
- If you ever want people to trust and update the app long-term, Google Play (even the free "internal testing" track) is worth it — it skips the scary warning, handles updates automatically, and doesn't rely on a third-party file host staying up.

## Stack

- React 18 + Vite
- Firebase Auth, Firestore, Storage
- lucide-react (icons)
