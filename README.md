# Zareen — Portfolio Site

Plain HTML/CSS/JS, no build step. Ready for GitHub Pages.

## Host it on GitHub Pages

1. Create a new repo on GitHub (e.g. `zareen` or `yourname.github.io`).
2. From this `site/` folder:
   ```
   git init
   git add .
   git commit -m "Initial portfolio site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. On GitHub: repo **Settings → Pages → Source → Deploy from branch → main → / (root)**.
4. Your site goes live at `https://<your-username>.github.io/<repo-name>/`
   (or `https://<your-username>.github.io/` if the repo is named `<your-username>.github.io`).

## Before you publish, replace:

- **Upwork link** — every `href="#"` next to "Hire us on Upwork" / "Message us on Upwork" (`index.html`, 2 spots).
- **Email** — `hello@example.com` in the contact section and footer.
- **GitHub / Upwork footer links** — bottom of the page.
- **Projects, hero text, about text** — edit these from `/admin/`, not by hand (see below).

## Admin panel — `/admin/`

The homepage's hero text, about text, and project list are not hardcoded — they load at
runtime from `data/content.json`. `/admin/` is a small editor for that file: sign in,
edit, hit **Publish changes**, and it commits straight to this repo. GitHub Pages
picks it up within a minute or two.

The login form is a soft gate (client-side, unlisted, blocked from search engines via
`robots.txt`) — it is not real access control, since anyone with the URL and browser
devtools could bypass it. The real protection is separate: saving requires a GitHub
token pasted into the browser on first use, stored only in that browser's `localStorage`,
never committed to the repo. Without that token nothing can be written, regardless of
the login. Use a **fine-grained personal access token** scoped only to this repo with
"Contents: Read and write" — not a classic token with broad account access.

## Structure

```
site/
  index.html
  css/styles.css
  js/main.js
  data/content.json   — hero/about text + project list, edited via /admin/
  admin/               — content editor (index.html, admin.css, admin.js)
  assets/              — logo files (bracket mark + wordmark, light/dark)
```

## Swapping the logo mark

The site uses the "Bracket" mark by default (`assets/bracket-icon.svg`, `assets/bracket-wordmark.svg`).
The `logo/` folder one level up has two more directions (Facet, Node) in the same file layout —
copy whichever you prefer into `assets/` and update the `src`/`href` paths in `index.html`.
