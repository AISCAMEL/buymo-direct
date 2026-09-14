# PWA Icons Required

The following PNG icon files must be placed in the `/public` directory for the PWA manifest and service worker to work correctly:

## Required files

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192x192 px | Home screen icon (Android), push notification icon/badge |
| `icon-512.png` | 512x512 px | Splash screen / high-res home screen icon |

## Design notes

- Background colour: `#1e3a5f` (navy, matches `theme_color` in manifest.json)
- Logo: BUYMO wordmark or logomark in white
- Format: PNG with transparency or solid navy background
- The 192px icon is also used as the notification `badge` in sw.js

## Apple Touch Icon (optional but recommended)

Add `apple-touch-icon.png` (180x180 px) in `/public` for Safari/iOS home screen.  
Reference it in `app/layout.tsx` via the `icons` metadata field if needed:

```typescript
icons: {
  apple: '/apple-touch-icon.png',
},
```
