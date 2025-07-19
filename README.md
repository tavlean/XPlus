# XTab

A Chrome extension that automatically opens X (Twitter) post links and notifications in new tabs when clicked.

## Features

- Automatically opens X post links in new tabs when clicking on post timestamps
- Automatically opens notifications in new tabs when clicking the notifications link
- Works with dynamically loaded content
- Only affects specific links (posts and notifications), leaving other links unchanged
- Lightweight and efficient

## Installation

### For Development (Unpacked Extension)

1. Clone this repository
2. Run `npm run dev` to copy the shared assets to the Chrome directory
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the `src/chrome` directory

### For Regular Use (Production)

1. Clone this repository
2. Run `npm run build` to generate the distribution file
3. Find the generated `xtab.zip` in the `dist` directory
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Drag and drop the zip file into the extensions page
   - Alternatively, you can unzip the file and load it using "Load unpacked"

## Usage

Once installed, the extension will automatically:
- Detect post links on X (Twitter) and open them in new tabs when clicking on post timestamps
- Detect the notifications link in the left sidebar and open it in a new tab when clicked
- Work with both static and dynamically loaded content

## Development

The extension is built using Manifest V3 and follows Chrome's extension guidelines.

### Project Structure

```
├── README.md              # This file
├── LICENSE                # MIT License
├── /src/                  # Extension implementation files
│   └── /chrome/           # Chrome extension files
├── /shared-assets/        # Shared icons and images
│   ├── icon16.png         # 16x16 icon
│   ├── icon48.png         # 48x48 icon
│   └── icon128.png        # 128x128 icon
├── /screenshots/          # Store screenshots
│   └── /chrome/           # Chrome Web Store screenshots
├── /docs/                 # Additional documentation
│   └── CONTRIBUTING.md    # Contribution guidelines
├── .gitignore             # Git ignore file
├── package.json           # NPM package configuration
└── /dist/                 # Build artifacts (generated, not in repo)
```

### Building

The project uses npm scripts to build distribution files:

```bash
# Install dependencies (if needed)
npm install

# Copy assets for development
npm run dev

# Build for production
npm run build
```

Build files are generated in the `dist/` directory and are ready for submission to the Chrome Web Store.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 