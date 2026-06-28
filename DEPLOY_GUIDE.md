# 🥗 How to Deploy Nouri as a PWA on GitHub Pages

Follow these steps exactly. Each one is short. You've got this!

---

## Step 1 — Create a GitHub Repository

1. Go to **github.com** and sign in
2. Click the **+** button in the top right → **New repository**
3. Name it: `nouri`
4. Set it to **Public**
5. Leave everything else as-is
6. Click **Create repository**

---

## Step 2 — Upload Your Files

1. On your new empty repo page, click **uploading an existing file**
2. Drag and drop the entire `nouri` folder's contents:
   - `package.json`
   - `src/` folder (with `App.js`, `index.js`, `index.css`)
   - `public/` folder (with `index.html`, `manifest.json`)
3. Click **Commit changes**

---

## Step 3 — Open GitHub Codespaces

1. On your repo page, click the green **Code** button
2. Click the **Codespaces** tab
3. Click **Create codespace on main**
4. Wait about 60 seconds — a VS Code editor opens in your browser

---

## Step 4 — Install & Deploy (copy-paste these exactly)

In the Codespaces terminal at the bottom, run these one at a time:

```
npm install
```
(wait for it to finish — about 1-2 minutes)

```
npm install gh-pages --save-dev
```

Now open `package.json` and add this line at the very top, replacing YOUR-USERNAME with your GitHub username:

```json
"homepage": "https://YOUR-USERNAME.github.io/nouri",
```

Then run:
```
npm run deploy
```
(this builds and publishes — takes about 2 minutes)

---

## Step 5 — Enable GitHub Pages

1. Go to your repo on github.com
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Branch**, select `gh-pages` → click **Save**
4. Wait 2-3 minutes

---

## Step 6 — Visit Your App!

Go to: `https://YOUR-USERNAME.github.io/nouri`

🎉 Nouri is live!

---

## Step 7 — Install as an App on Your Phone

**Android / Chromebook:**
1. Open the URL in Chrome
2. Tap the three-dot menu → **Add to Home screen**
3. Tap **Add**

Nouri now lives on your home screen like a real app!

---

## Updating Nouri in the Future

Whenever you want to make changes:
1. Open GitHub Codespaces again
2. Edit your files
3. Run `npm run deploy`
4. Done — your live app updates automatically

---

## Troubleshooting

**Page shows 404?** Wait 5 more minutes — GitHub Pages can be slow to activate.

**App looks broken?** Make sure the `homepage` in `package.json` exactly matches your URL.

**Can't find the terminal in Codespaces?** Go to menu → Terminal → New Terminal.
