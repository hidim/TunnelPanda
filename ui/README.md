# TunnelPanda Electron UI

A modern, graphical user interface for TunnelPanda built with Electron. This UI provides a complete control center for managing your TunnelPanda server, Cloudflare tunnel, security settings, and monitoring.

## Features

### 🎛️ **Server Management**
- Start/stop/restart TunnelPanda server
- Start/stop/restart Cloudflare tunnel
- Real-time console output
- Process monitoring

### 🔐 **Security Configuration**
- Basic Authentication settings
- API token management
- Rate limiting configuration
- IP restrictions monitoring
- Security headers control

### 📊 **Monitoring & Analytics**
- Real-time activity feed
- Request statistics
- WebSocket connection monitoring
- Client IP analysis
- Performance metrics

### 🗄️ **Database Management**
- Vector database configuration
- Collection monitoring
- Connection status
- Database statistics
- Real-time updates

### 🔗 **API Testing**
- Built-in API tester
- Endpoint documentation
- WebSocket testing
- Request/response viewer
- Sample payloads

### 📝 **Log Management**
- Log file viewer
- Real-time log streaming
- Log filtering and search
- Export functionality
- Multiple log levels

### ⚙️ **Settings**
- Application configuration
- Theme selection
- Auto-refresh settings
- Export/import configuration
- System information

## Getting Started

### Prerequisites
- Node.js 18+ installed
- All TunnelPanda dependencies installed
- Electron dependencies installed

### Running the UI

#### Development Mode
```bash
npm run electron-dev
```

#### Production Mode
```bash
npm run electron
```

### Building Distributable App
```bash
npm run build-electron
```

This will create platform-specific installers in the `dist/` directory.

## Architecture

The Electron UI consists of three main components:

1. **Main Process** (`ui/main.js`)
   - Manages the Electron application lifecycle
   - Handles IPC communication
   - Controls TunnelPanda server and tunnel processes
   - Manages WebSocket connections for monitoring

2. **Renderer Process** (`ui/index.html`, `ui/app.js`, `ui/styles.css`)
   - Provides the user interface
   - Handles user interactions
   - Displays real-time data and logs
   - Manages configuration forms

3. **Preload Script** (`ui/preload.js`)
   - Securely exposes IPC methods to the renderer
   - Maintains security isolation between processes

## UI Tabs

### Dashboard
- System overview
- Quick actions
- Status indicators
- Recent activity
- Connection information

### Server Control
- Start/stop server and tunnel
- Console output
- Process status
- Control buttons

### Security
- Authentication configuration
- Rate limiting settings
- Security headers
- IP monitoring

### Endpoints
- API endpoint listing
- Built-in API tester
- WebSocket testing
- Sample requests

### Monitoring
- Real-time statistics
- WebSocket status
- Activity monitor
- Client analysis

### Database
- Database configuration
- Collection management
- Connection testing
- Statistics

### Logs
- Log file browser
- Real-time viewer
- Filtering and search
- Export functionality

### Settings
- Application settings
- UI preferences
- Configuration management
- System information

## Keyboard Shortcuts

- `Cmd/Ctrl + S` - Start Server
- `Cmd/Ctrl + Shift + S` - Stop Server
- `Cmd/Ctrl + T` - Start Tunnel
- `Cmd/Ctrl + Shift + T` - Stop Tunnel
- `Cmd/Ctrl + R` - Reload UI
- `F12` - Toggle Developer Tools

## Security Features

The Electron UI maintains the same security standards as TunnelPanda:

- **Process Isolation**: Main and renderer processes are isolated
- **Context Isolation**: Secure IPC communication
- **No Node Integration**: Renderer process has no direct Node access
- **Secure Defaults**: CSP headers and secure configuration
- **Credential Protection**: Passwords and tokens are handled securely

## Command Line vs. UI

The Electron UI is designed to complement, not replace, the command-line interface:

### Use the UI when you want:
- Visual overview of system status
- Point-and-click configuration
- Real-time monitoring
- Log browsing
- API testing
- Quick troubleshooting

### Use the command line when you want:
- Scripting and automation
- Remote server management
- CI/CD integration
- Minimal resource usage
- SSH-based management

All npm commands (`npm start`, `npm run setup`, `npm run update`) work exactly the same whether you use the UI or command line.

## Troubleshooting

### UI Won't Start
1. Check Node.js version: `node --version` (should be 18+)
2. Reinstall dependencies: `npm install`
3. Check for port conflicts
4. Verify file permissions

### Server Won't Start from UI
1. Check configuration in Settings tab
2. Verify .env file exists and is valid
3. Check console output for errors
4. Try starting manually: `npm start`

### Tunnel Connection Issues
1. Verify Cloudflare tunnel configuration
2. Check cloudflared installation
3. Verify tunnel authentication
4. Check network connectivity

### WebSocket Monitoring Not Working
1. Ensure server is running
2. Check authentication credentials
3. Verify network connectivity
4. Check firewall settings

## Development

### Project Structure
```
ui/
├── main.js          # Main Electron process
├── preload.js       # Preload script for IPC
├── index.html       # Main UI layout
├── styles.css       # UI styling
├── app.js          # UI logic and interactions
└── assets/         # Icons and images
```

### Adding New Features
1. Add UI elements to `index.html`
2. Add styling to `styles.css`
3. Add JavaScript logic to `app.js`
4. Add IPC handlers to `main.js` if needed
5. Update preload script for new IPC methods

### Building for Distribution
The build configuration in `package.json` creates:
- **macOS**: `.dmg` installer and `.app` bundle
- **Windows**: `.exe` installer and portable app
- **Linux**: `.AppImage`, `.deb`, and `.rpm` packages

## License

Same as TunnelPanda - MIT License
