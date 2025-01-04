# GitToPDF Bot

A Telegram bot that converts GitHub repositories into PDF documents, with an admin dashboard for management.

## Project Structure

```
GitToPdf_bot/
├── bot/                 # Telegram Bot
│   ├── src/            # Bot source code
│   │   ├── config/     # Configuration files
│   │   ├── handlers/   # Command & callback handlers
│   │   ├── middleware/ # Bot middleware
│   │   ├── modules/    # Core functionality
│   │   ├── types/      # TypeScript types
│   │   └── utils/      # Utility functions
│   ├── package.json    # Bot dependencies
│   └── tsconfig.json   # TypeScript config for bot
│
├── adminDash/          # Admin Dashboard (TWA)
│   ├── src/           # Dashboard source code
│   ├── public/        # Static files
│   └── package.json   # Dashboard dependencies
│
└── temp/              # Shared temporary files

```

## Features

- Convert GitHub repositories to PDF
- Admin dashboard for user management
- Real-time bot statistics
- User access control
- Repository processing history

## Setup & Development

### Bot Setup
```bash
cd bot
npm install
npm run dev
```

### Admin Dashboard Setup
```bash
cd adminDash
npm install
npm run dev
```

### Environment Variables

#### Bot (.env)
```
TELEGRAM_BOT_TOKEN=your_bot_token
GITHUB_TOKEN=your_github_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
WEBAPP_URL=your_webapp_url
WEBAPP_TOKEN=your_webapp_token
```

#### Dashboard (.env)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_key
VITE_BOT_TOKEN=your_bot_token
```

## Deployment

Each part of the project can be deployed independently:

### Bot Deployment
```bash
cd bot
npm run build
```

### Dashboard Deployment
```bash
cd adminDash
npm run build
```

## License

See [LICENSE](LICENSE) file for details.