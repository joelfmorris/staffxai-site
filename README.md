# StaffxAI Website

Sana-style landing page + blog built with React, Vite, and Tailwind CSS.

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev

# 3. Open http://localhost:5173
```

## Project Structure

```
staffxai-site/
├── public/
│   ├── images/           ← Put your AI-generated images here
│   │   └── blog/         ← Blog post images
│   └── favicon.svg
├── src/
│   ├── blog/
│   │   └── posts.js      ← Add blog posts here (HTML content)
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   └── ScrollToTop.jsx
│   ├── pages/
│   │   ├── Home.jsx       ← Landing page sections
│   │   ├── BlogIndex.jsx  ← Blog listing
│   │   └── BlogPost.jsx   ← Individual post template
│   ├── config.js          ← ALL site content (pricing, FAQs, services, etc.)
│   ├── hooks.js           ← Scroll reveal + counter animations
│   ├── index.css          ← Tailwind + custom animations + blog prose styles
│   ├── App.jsx            ← Router setup
│   └── main.jsx           ← Entry point
├── vercel.json            ← SPA routing for Vercel
├── tailwind.config.js
└── package.json
```

## How to Edit Content

### Site copy, pricing, FAQs
Edit `src/config.js` — every piece of site content lives here in clearly labelled objects.

### Blog posts
Edit `src/blog/posts.js` — add new posts to the top of the array. Content is HTML strings.
For a future upgrade, swap this for markdown files processed with `gray-matter` + `marked`.

### Images
1. Generate images using AI tools (see image prompts below)
2. Export as WebP at 2x resolution (min 2400px wide)
3. Place in `public/images/`
4. Update the `image` field in `config.js` or `posts.js` to `/images/filename.webp`

## Image Generation Prompts

Use these with Midjourney, DALL·E, or similar:

| Image | Prompt |
|-------|--------|
| Service: Strategy | "Studio product shot of an elegant lightbulb with warm amber glow on pure white background, soft shadow, minimal editorial photography, 3:2" |
| Service: Education | "Clean overhead shot of a silver tablet with colorful geometric blocks on its surface, white background, Scandinavian design, 3:2" |
| Service: Development | "Desktop monitor and tablet showing dark dashboard with data visualizations, white studio background, editorial product photography, 16:9" |
| Blog images | "Clean minimal workspace photograph, [topic-relevant object], soft natural light, white/light background, Scandinavian editorial aesthetic, 2:1" |

**Style rules for all images:** Pure white background, soft diffused lighting, one hero object per frame, no text overlays, calm and intelligent mood.

## Deploy to Vercel

### First time setup

```bash
# 1. Create a GitHub repo and push
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/staffxai-site.git
git branch -M main
git push -u origin main

# 2. Go to https://vercel.com
#    - Sign in with GitHub
#    - Click "New Project"
#    - Import your staffxai-site repo
#    - Framework: Vite (auto-detected)
#    - Click "Deploy"

# 3. Connect your domain
#    - In Vercel dashboard → Settings → Domains
#    - Add staffxai.com.au
#    - Vercel will give you a CNAME record
#    - Add that CNAME in your domain registrar's DNS settings
#    - SSL is automatic
```

### Ongoing updates
```bash
# Edit files locally, then:
git add .
git commit -m "Update pricing"
git push

# Vercel auto-deploys in ~30 seconds
```

## Tech Stack
- **React 19** — UI components
- **Vite 6** — Build tool (fast dev server, optimised production builds)
- **Tailwind CSS 3.4** — Utility-first styling
- **React Router 7** — Client-side routing (home + blog)
- **Vercel** — Hosting (free tier, global CDN, auto-HTTPS)

## Future Enhancements
- [ ] Swap blog HTML strings for .md files with frontmatter
- [ ] Add RSS feed for blog
- [ ] Add Open Graph meta tags per page (SEO)
- [ ] Add Google Analytics or Plausible
- [ ] Add sitemap.xml generation
