# 🏗️ SitePro — Deploy It Yourself (No Coding Required!)

This guide walks you through getting SitePro live on the internet
so your employees can use it on their phones. You don't need any
programming experience — just follow each step.

---

## What You'll End Up With
- A live web app at a URL like `sitepro-yourcompany.vercel.app`
- Your employees open the URL on their phone → tap "Add to Home Screen"
- It works just like a regular app — even offline!
- Total time: about 30–45 minutes
- Total cost: $0 (everything uses free tiers)

---

## STEP 1: Create Your Accounts (10 minutes)

### 1A: GitHub Account (stores your code)
1. Go to https://github.com
2. Click "Sign Up"
3. Create an account with your email
4. Verify your email

### 1B: Vercel Account (hosts your app for free)
1. Go to https://vercel.com
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub

---

## STEP 2: Upload the Code to GitHub (10 minutes)

### 2A: Create a new repository
1. Go to https://github.com/new
2. Repository name: `sitepro`
3. Make sure "Private" is selected (keeps your code private)
4. Click "Create repository"

### 2B: Upload the project files
1. On your new repository page, click "uploading an existing file"
   (it's a blue link in the instructions)
2. UNZIP the sitepro-final.zip file on your computer first
3. Drag ALL the files and folders from inside the unzipped folder
   into the upload area. You should see:
   - public/ (folder)
   - src/ (folder)
   - index.html
   - package.json
   - vite.config.js
   - vercel.json
   - .gitignore
4. Scroll down and click "Commit changes"
5. Wait for the upload to finish

---

## STEP 3: Deploy on Vercel (5 minutes)

1. Go to https://vercel.com/new
2. You should see your `sitepro` repository listed
3. Click "Import" next to it
4. On the next screen, leave everything as default
5. Click "Deploy"
6. Wait 1–2 minutes while it builds
7. 🎉 When it says "Congratulations!" your app is LIVE!
8. Click the link it gives you — that's your app URL!

Your URL will look like: `sitepro-xxxxx.vercel.app`

---

## STEP 4: Share With Your Team (5 minutes)

### For iPhone users:
1. Open Safari (must be Safari, not Chrome)
2. Go to your app URL
3. Tap the Share button (square with arrow)
4. Scroll down and tap "Add to Home Screen"
5. Tap "Add"
6. The app icon now appears on the home screen!

### For Android users:
1. Open Chrome
2. Go to your app URL
3. A banner will appear saying "Add SitePro to Home screen"
4. Tap "Install"
5. Or: tap the three-dot menu → "Add to Home screen"

### Quick share:
Send this text message to your team:
"Download our new project tracking app: [YOUR URL]
Open the link, then add it to your home screen."

---

## STEP 5: Optional — Custom Domain Name

If you want a nicer URL like `app.yourcompany.com`:

1. Buy a domain at https://namecheap.com or https://godaddy.com (~$12/year)
2. In Vercel, go to your project → Settings → Domains
3. Add your domain
4. Follow Vercel's instructions to update your DNS settings
5. Your app is now at your custom domain!

---

## Updating the App

Whenever you need to update the app:

1. Make changes to files on your computer
2. Go to your GitHub repository
3. Navigate to the file you want to change
4. Click the pencil icon to edit
5. Make your changes
6. Click "Commit changes"
7. Vercel automatically rebuilds and deploys within 1–2 minutes!

Or, if you're working with me (Claude), I can give you updated
files — just upload them to GitHub and it auto-deploys.

---

## Generating App Icons

Your app needs proper icons for home screens. The easiest way:

1. Go to https://favicon.io/favicon-generator/
2. Type "SP" as the text
3. Choose a dark background (#141414) and orange text (#f5a623)
4. Download the icons
5. Rename them to `icon-192.png` and `icon-512.png`
6. Upload them to the `public/icons/` folder in GitHub

---

## Troubleshooting

**"The page looks weird on my phone"**
→ Make sure you're using the latest version of Safari (iPhone)
   or Chrome (Android)

**"I can't find 'Add to Home Screen'"**
→ iPhone: Must use Safari, not Chrome
→ Android: Must use Chrome, not other browsers

**"The build failed on Vercel"**
→ Go to Vercel → your project → Deployments
→ Click the failed deployment to see the error
→ Most common fix: make sure all files were uploaded correctly

**"My changes aren't showing up"**
→ On your phone, close and reopen the app
→ Or clear the app cache in your phone settings

---

## Need Help?

Come back to this Claude conversation anytime!
I can help you:
- Fix any issues
- Add new features
- Update the design
- Eventually add a real database and user accounts
- Prepare for the App Store and Google Play

You're building something great! 🚀
