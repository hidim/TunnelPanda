# TunnelPanda - Feature-Based Architecture

This document describes the new feature-based folder structure for TunnelPanda, designed to support both core (free) and pro (premium) features.

## 📁 Folder Structure

```
apps/
├── core/                          # Core application (free tier)
│   ├── features/                  # Feature modules
│   │   ├── auth/                  # Authentication & authorization
│   │   │   ├── index.js          # Feature exports
│   │   │   └── middleware.js     # Auth middleware
│   │   ├── database/              # Database operations
│   │   │   ├── index.js          # Feature exports
│   │   │   └── routes.js         # Database routes
│   │   ├── health/                # Health checks
│   │   │   ├── index.js          # Feature exports
│   │   │   └── routes.js         # Health check routes
│   │   ├── ollama/                # Ollama API integration
│   │   │   ├── index.js          # Feature exports
│   │   │   └── routes.js         # Ollama routes
│   │   ├── monitoring/            # System monitoring
│   │   │   ├── index.js          # Feature exports
│   │   │   └── routes.js         # Monitoring routes
│   │   └── tunneling/             # Tunnel management
│   │       ├── index.js          # Feature exports
│   │       └── routes.js         # Tunnel routes
│   ├── shared/                    # Shared utilities
│   │   ├── config/                # Configuration management
│   │   │   ├── config.js         # Main config
│   │   │   └── setup.js          # Setup wizard
│   │   ├── middleware/            # Common middleware
│   │   └── utils/                 # Utility functions
│   │       ├── api.js            # Ollama API client
│   │       ├── logger.js         # Logging utility
│   │       ├── dbFactory.js      # Database factory
│   │       ├── dbEvents.js       # Database events
│   │       └── connectors/       # Database connectors
│   └── ui/                        # Core UI components
│       ├── components/            # Reusable components
│       ├── pages/                 # Core pages
│       └── assets/                # UI assets
├── desktop/                       # Electron desktop app
│   ├── main/                      # Main process
│   │   └── main.js               # Electron main process
│   ├── preload/                   # Preload scripts
│   │   └── preload.js            # Preload script
│   └── renderer/                  # Renderer process UI
│       ├── index.html            # Main HTML
│       ├── styles.css            # Styles
│       ├── app.js                # App logic
│       └── app-clean.js          # Clean app version
└── server/                        # Main server entry point
    └── app.js                    # Express server

cloudflared/                       # Cloudflare tunnel config
logs/                             # Application logs
```

## 🎯 Benefits of Feature-Based Structure

### 1. **Modularity**
- Each feature is self-contained with its own routes, middleware, and logic
- Easy to add, remove, or modify features independently
- Clear separation of concerns

### 2. **Scalability**
- Simple to add new features without affecting existing code
- Pro features can be added as separate modules
- Easy to split into microservices if needed

### 3. **Maintainability**
- Related code is grouped together
- Easy to locate and modify feature-specific code
- Reduced coupling between features

### 4. **Team Development**
- Different team members can work on different features
- Minimal conflicts when working on separate features
- Clear ownership boundaries

## 🔧 How to Add Pro Features

When adding the Pro folder/branch, simply create:

```
apps/
├── core/           # Existing core features
└── pro/            # New pro features
    ├── features/
    │   ├── analytics/     # Advanced analytics
    │   ├── teams/         # Team management
    │   ├── backup/        # Backup features
    │   └── integrations/  # Third-party integrations
    └── shared/            # Pro-specific utilities
```

The server can then load features from both `core` and `pro` directories, enabling seamless feature extension.

## 📝 Usage Examples

### Importing Features
```javascript
// Import entire core module
const core = require('./apps/core');

// Use specific features
app.use('/auth', core.auth.middleware);
app.use('/api', core.ollama.routes);
app.use('/db', core.database.routes);
```

### Adding New Features
1. Create feature directory in `apps/core/features/`
2. Add routes, middleware, and logic files
3. Create `index.js` to export feature components
4. Update main server to include new routes

### Pro Feature Integration
1. Create pro feature in `apps/pro/features/`
2. Follow same structure as core features
3. Server loads both core and pro features
4. Pro features can extend or override core functionality

This structure provides a solid foundation for both current development and future feature expansion.
