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
- **Projects** — `#work` section has 2 placeholder cards and 1 empty slot. Swap in real projects: title, one-line result, tech tags, link. Delete the empty-slot card once you have 3+.
- **About paragraph** — adjust once details change (team size, location, focus).

## Structure

```
site/
  index.html
  css/styles.css
  js/main.js
  assets/        — logo files (bracket mark + wordmark, light/dark)
```

## Swapping the logo mark

The site uses the "Bracket" mark by default (`assets/bracket-icon.svg`, `assets/bracket-wordmark.svg`).
The `logo/` folder one level up has two more directions (Facet, Node) in the same file layout —
copy whichever you prefer into `assets/` and update the `src`/`href` paths in `index.html`.
