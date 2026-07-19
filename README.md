# Web GBA Emulator

A web-based Game Boy Advance (GBA) emulator built with React, Vite, and mGBA (via WebAssembly). This emulator allows you to load and play GBA ROMs directly in your web browser.

## Features

- High performance Game Boy Advance emulation powered by mGBA WebAssembly.
- Fast forward speed controls (1x, 2x, 3x, 4x, and 5x).
- Auto-mute sound option during fast forward.
- Frame skipping configurations (0, 1, or 2 frames).
- Advanced video filters including AMD Super Resolution 2.0, HQ Crisp/Smooth/Vibrant/Soft, Bilinear, and LCD Subpixel Grid.
- Game screen size multiplier settings (1x up to 10x scale) with automatic viewport limits for mobile devices.
- Fully responsive interface optimized for both desktop and mobile screens.
- Local storage integrations for save files and settings preservation.

## Prerequisites

Before starting, ensure you have the following installed on your machine:
- Node.js (v18.x or higher recommended)
- npm (v9.x or higher)

## Setup and Installation

Follow these steps to run the application locally:

1. Clone or copy the repository files:
   ```bash
   cd web-gba
   ```

2. Install the project dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Alternatively, you can run the server directly using:
   ```bash
   node node_modules/vite/bin/vite.js --host
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Local SSL / HTTPS Configuration

To test with native Node.js SSL locally (useful for hosting over a local network with HTTPS), generate self-signed certificates in the project root directory:

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes
```

Once Vite detects `key.pem` and `cert.pem` in the project root, it will automatically serve the development server over HTTPS.

## Production Build

To build the static files for production hosting:

```bash
npm run build
```

This will compile the application and output the static assets into the `dist/` directory.

## Hosting and Deployment

Since the application compiles into static HTML, CSS, and JS files, it can be hosted on any static hosting provider or virtual machine (VM).

### Crucial Requirement for WebAssembly (COOP & COEP Headers)
To allow the mGBA emulator core's multithreading and shared memory feature (SharedArrayBuffer) to function, your hosting provider must serve the following HTTP headers:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

If these headers are not present, the emulator will fail to load in the browser.

### Hosting Options

#### 1. Free Static Hosting (Netlify, Vercel, Cloudflare Pages)
Upload the contents of the `dist/` directory or connect your Git repository. Ensure you configure custom headers in the configuration file of your provider:

* **Netlify (`netlify.toml`):**
  ```toml
  [[headers]]
    for = "/*"
      [headers.values]
        Cross-Origin-Opener-Policy = "same-origin"
        Cross-Origin-Embedder-Policy = "require-corp"
  ```
* **Vercel (`vercel.json`):**
  ```json
  {
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
          { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
        ]
      }
    ]
  }
  ```

#### 2. Virtual Machines (Linux or Windows VMs via Nginx)
If you host on a VM (such as Ubuntu or Windows Server), install Nginx and configure it to point to your build `dist/` folder.

Add the headers in your Nginx server configuration block:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your_domain_or_ip;

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name your_domain_or_ip;

    ssl_certificate /etc/letsencrypt/live/your_domain_or_ip/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain_or_ip/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /path/to/web-gba/dist;
    index index.html;

    # Serve pre-compressed static assets (.gz)
    gzip_static on;

    # Disable caching for HTML files (index.html SPA entry point)
    location ~* \.(?:html|htm)$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
    }

    # Cache compiled assets forever because they contain unique hashes
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Crucial headers for WebAssembly (SharedArrayBuffer)
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
}
```

Ensure the paths for certificates and root directory match your setup path.

#### Generating SSL Certificates via Certbot (Let's Encrypt)
If you are hosting on a Linux VM, you can obtain a free SSL certificate using Certbot:

1. Install Certbot:
   - For Ubuntu/Debian: `sudo apt install certbot python3-certbot-nginx -y`
   - For RHEL/Rocky Linux: `sudo dnf install certbot python3-certbot-nginx -y`
2. Run Certbot to generate the certificates and automatically configure Nginx:
   ```bash
   sudo certbot --nginx -d your_domain
   ```

## Project Structure

- `src/` - Contains the React components, styles, and logic.
  - `src/components/` - Emulator and UI components.
  - `src/index.css` - Global and layout styling.
- `public/` - Static assets served directly (e.g., favicon.svg).
- `dist/` - Production build outputs.

## Credits

- mGBA: The underlying Game Boy Advance emulator core.
- @thenick775/mgba-wasm: WebAssembly build of mGBA used to run the emulator core in the browser.
- React and Vite: The frontend library and build tool powering the application.

## Author

Alliance-Sky

## License

This project is licensed under the MIT License.
