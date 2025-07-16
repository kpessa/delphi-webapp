# Brand Image Processing Instructions

## Target Files (Brand Logos Only)
- Light theme: `/home/pessk/code/delphi-webapp/static/brand-light.png`
- Dark theme: `/home/pessk/code/delphi-webapp/static/brand-dark.png`

## Quick Processing Options

### Option 1: Remove.bg (Easiest)
1. Visit https://www.remove.bg
2. Upload each brand image
3. Download the transparent version
4. Replace the original files

### Option 2: GIMP (Free desktop tool)
1. Open image in GIMP
2. Select → By Color Tool
3. Click background areas (gray/black)
4. Press Delete
5. File → Export as PNG (ensure transparency is preserved)

### Option 3: Photopea (Free browser-based)
1. Visit https://www.photopea.com
2. Upload image
3. Use Magic Wand tool to select background
4. Delete background
5. Export as PNG

## After Processing
Replace the original files with your new transparent versions. The navigation component at `src/lib/components/navigation.svelte:23-35` will automatically use the updated images.

## Testing
Run `pnpm dev` to test the transparent logos on both light and dark themes.