
# WoW LFG Discord Bot

A comprehensive Discord bot for World of Warcraft group finding with advanced features including cross-server networking, real-time Raider.IO integration, intelligent scheduling with voice channel automation, and dynamic Battle.net API integration. Built with TypeScript, featuring robust error handling, smart caching, and production-ready architecture.

## ✨ Features

### Core LFG Functionality
- **Dynamic Dungeon Support**: Automatically fetches current M+ season dungeons from Battle.net API
- **Multi-Difficulty Support**: Normal, Heroic, Mythic, and Mythic+ dungeons, plus Delves
- **Role Management**: Tank, Healer, and DPS role assignments with party buff tracking
- **Smart Scheduling**: Timezone-aware start times with automatic voice channel creation
- **Thread Management**: Private group threads with automatic cleanup

### Raider.IO Integration
- **BattleTag Linking**: Connect your Discord account to your Battle.net BattleTag
- **Main Character Setup**: Set your main character for automatic data fetching
- **M+ Score Display**: Color-coded Mythic+ scores based on prestige ranges
- **Raid Progress**: Current raid progression display in group embeds
- **Profile Management**: View and refresh your character data

### Cross-Guild Networking
- **Guild Linking**: Connect multiple Discord servers for cross-posting
- **Customizable X-Posting**: Configure what information to share between servers
- **LFM Channel Management**: Set dedicated channels for LFG posts
- **Bidirectional Sync**: Groups automatically post to all linked servers

### Advanced Features
- **Graceful Startup**: Automatic cleanup of expired events on bot restart
- **Voice Channel Integration**: Auto-created private voice channels with automatic user movement
- **TTS Countdown**: 10-second voice countdown with 30-second delay for group coordination
- **Warning System**: 5-minute advance notifications for group starts
- **Smart Cleanup**: Automatic archiving of completed groups after 24 hours
- **Persistent Configuration**: Database-backed guild settings and user profiles
- **Dynamic Season Detection**: Automatic current season detection from Raider.IO API
- **Image Fallback System**: Backup images for dungeon embeds when primary images fail
- **Admin Cleanup Tools**: Channel cleanup commands for administrators

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Discord Bot Token
- Battle.net API credentials (optional, for dynamic dungeons)

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Discord Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_BOT_APP_ID=your_discord_app_id
DEV_GUILD_ID=your_dev_guild_id  # For development commands

# Database
PROD_MONGO_URI=your_mongodb_connection_string

# Battle.net API (Optional - for dynamic dungeon fetching)
BATTLENET_CLIENT_ID=your_battlenet_client_id
BATTLENET_CLIENT_SECRET=your_battlenet_client_secret
WOW_REGION=us  # or eu, kr, tw, cn

# Logging (Optional)
LOGTAIL_SOURCE_TOKEN=your_logtail_token
```
### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lfg
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the bot**
   ```bash
   npm run dev  # Development mode
   npm start    # Production mode
   ```

### Docker Deployment

```bash
docker build -t wow-lfg-bot .
docker run -d --env-file .env wow-lfg-bot
```

## 📋 Commands

### Group Management
- `/lfm [difficulty] [dungeon] [level] [role]` - Create a new LFG group
- `/join group_id:<id> role:<role>` - Join an existing group
- `/leave group_id:<id>` - Leave a group
- `/groups [filters]` - List all active groups with optional filtering
- `/mygroups` - View your current groups with pagination

### User Profile & Raider.IO
- `/set-battletag battletag:<name#1234>` - Link your BattleTag
- `/set-main character:<name> realm:<realm> region:<region>` - Set main character
- `/profile` - View your profile with M+ score and raid progress
- `/refresh-profile` - Update your Raider.IO data

### Guild Management
- `/set-lfm-channel channel:<#channel>` - Set LFM channel for this server
- `/link-guild guild_id:<id> guild_name:<name>` - Link with another server
- `/unlink-guild guild_id:<id>` - Unlink from a server
- `/guild-config` - View server configuration and linked servers

### Admin Commands
- `/cleanup` - Delete all bot messages, threads, and embeds in current channel (Admin only)
- `/set-fallback` - Set Aliwicious (Illidan-US) as fallback character for Raider.IO data (Admin only)
- `/refresh-season` - Refresh current season data from Raider.IO API (Admin only)

### Utility
- `/help` - Show all available commands
- `/refresh-dungeons` - Update dungeon list from Battle.net API

## 🎮 Usage Examples

### Creating a Group
```
/lfm mythic "Eco-Dome Al'dani" "20" tank
```
This creates a Mythic+ 20 Eco-Dome Al'dani group where you're the tank.

### Setting Up Cross-Server Posting
```
/set-lfm-channel channel:#looking-for-group
/link-guild guild_id:123456789 guild_name:"Alliance Raiders" include_voice_channels:true include_mythic_plus_score:true
```

### User Profile Setup
```
/set-battletag battletag:PlayerName#1234
/set-main character:MyMain realm:Stormrage region:us
```

## 🔧 Configuration

### Guild Settings
- **Auto Cleanup**: Groups are automatically archived after 24 hours
- **Voice Channels**: Auto-created 5 minutes before group start
- **Warning Messages**: 5-minute advance notifications
- **X-Posting**: Configurable cross-server posting

### Raider.IO Integration
- **M+ Score Colors**: 
  - 🟠 3000+ (Cutting Edge)
  - 🟣 2500+ (High End)
  - 🔵 2000+ (Good)
  - 🟢 1500+ (Decent)
  - 🟡 1000+ (Beginner)
  - ⚪ <1000 (Low)

### Cross-Guild Features
- **Bidirectional Linking**: Servers can link to each other
- **Customizable X-Posts**: Choose what information to share
- **Channel Auto-Detection**: Finds suitable channels if not configured
- **Persistent Settings**: All configurations saved to database

## 🏗️ Architecture & Technical Analysis

### System Overview
This bot represents a sophisticated multi-server Discord application with enterprise-grade features:

- **Microservice Architecture**: Modular services with clear separation of concerns
- **Event-Driven Design**: Reactive programming with Discord.js event handlers
- **Smart Caching**: Multi-layer caching with TTL and fallback strategies
- **Cross-Platform Integration**: Discord, Battle.net, and Raider.IO APIs
- **Real-time Synchronization**: Cross-guild posting with bidirectional updates

### Database Collections
- `group` - LFG group data with scheduling, voice channels, and cleanup metadata
- `user` - User profiles with BattleTag linking and cached Raider.IO data
- `guildconfig` - Server configurations with cross-posting settings
- `wowseason` - Battle.net API cache with smart refresh logic
- `season` - Raider.IO season data with automatic updates

### Core Services Architecture

#### Command Processing Layer
- **Dynamic Command Registration**: Runtime command building with current season data
- **Subcommand Architecture**: Conditional options based on difficulty type
- **Thread Safety**: Prevents thread-in-thread creation errors
- **Modal Integration**: Complex form handling with validation

#### Data Management Layer
- **BattleNetAPI**: OAuth2 authentication with token caching and fallback dungeons
- **RaiderIOAPI**: Character data fetching with smart caching and fallback characters
- **UserProfileService**: Profile management with color-coded M+ scores
- **SeasonService**: Automatic season detection and dungeon list updates

#### Guild & Cross-Server Layer
- **GuildLinkingService**: Bidirectional server linking with permission validation
- **XpostingService**: Real-time cross-posting with customizable information sharing
- **GroupFilterService**: Advanced filtering with pagination and search
- **StartupCleanupService**: Graceful recovery and orphaned resource cleanup

#### Voice & Automation Layer
- **Voice Channel Management**: Auto-creation with member-only permissions
- **TTS Integration**: Voice countdown system with queue management
- **Warning System**: 5-minute advance notifications with voice channel links
- **User Movement**: Automatic voice channel assignment and DM notifications

#### Infrastructure Layer
- **ErrorHandlerService**: Comprehensive error handling with user feedback
- **ImageFallbackService**: Resilient image handling for embeds
- **Mongoose Integration**: ODM with schema validation and connection pooling

## 🚀 Advanced Features

### Smart Scheduling
- Automatic voice channel creation 5 minutes before start
- Automatic user movement to voice channels when groups start
- TTS countdown with 30-second delay for group coordination
- Warning messages sent to all group members
- Graceful handling of past events on bot restart
- Thread archiving and cleanup

### Cross-Guild Networking
- Real-time cross-posting to linked servers
- Customizable information sharing
- Automatic channel detection
- Persistent configuration management

### Raider.IO Integration
- Automatic character data fetching
- Color-coded M+ score display
- Raid progression tracking
- Profile management commands

## 🔧 Development

### Project Structure
```
├── services/
│   ├── command/          # Discord slash command handlers
│   ├── embed/            # Embed creation and management
│   ├── guild/            # Cross-guild functionality
│   ├── raiderio/         # Raider.IO API integration
│   ├── startup/          # Startup cleanup and initialization
│   ├── user/             # User profile management
│   └── wow-api/          # Battle.net API integration
├── models/               # Database models
├── interfaces/           # TypeScript interfaces
├── schemas/              # MongoDB schemas
├── utils/                # Utility functions
└── enums/                # TypeScript enums
```

### Technology Stack & Implementation Details

#### Core Technologies
- **Discord.js v14**: Full Discord API integration with slash commands, modals, and voice channels
- **TypeScript**: Strict type safety with interfaces, enums, and compile-time validation
- **MongoDB**: NoSQL database with Mongoose ODM for schema validation and middleware
- **Node.js**: Async/await patterns with event-driven architecture

#### External Integrations
- **Battle.net API**: OAuth2 authentication for dynamic dungeon fetching
- **Raider.IO API**: RESTful character data with caching and fallback strategies
- **Docker**: Containerized MongoDB for development environment

#### Libraries & Utilities
- **Axios**: Promise-based HTTP client with retry logic and error handling
- **Chrono-node**: Natural language date parsing with timezone support
- **Lodash**: Utility functions for safe object manipulation
- **UUID v4**: Cryptographically secure unique identifiers
- **Concurrently**: Parallel process execution for development

#### Architecture Patterns
- **Service-Oriented Architecture**: Clear separation between business logic layers
- **Repository Pattern**: Database abstraction with Mongoose models
- **Factory Pattern**: Dynamic command creation based on API data
- **Observer Pattern**: Event-driven Discord interactions
- **Singleton Pattern**: Shared services like TTS queue management

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🔗 Additional Resources

### Documentation
- **[Optimization Guide](./OPTIMIZATION_AND_BEST_PRACTICES.md)**: Performance tuning, database optimization, and production deployment strategies
- **[TTS Setup Guide](./TTS_SETUP_WSL.md)**: Voice synthesis configuration for WSL environments

### Production Considerations
This codebase includes enterprise-ready features:
- Graceful startup/shutdown with resource cleanup
- Comprehensive error handling with user feedback
- Smart caching strategies to minimize API calls
- Database connection pooling and query optimization
- Cross-server data synchronization with conflict resolution
- Automatic failover systems for external API outages

## 🚀 Advanced Implementation Features

### Smart Caching Strategy
- **Battle.net API**: 6-hour cache with season validation
- **Raider.IO Data**: TTL-based caching with fallback characters
- **Image URLs**: Persistent fallback system for embed thumbnails
- **Cross-Guild Data**: Real-time synchronization with conflict resolution

### Error Handling & Resilience
- **API Failures**: Graceful degradation with hardcoded fallbacks
- **Database Errors**: Transaction rollback and retry mechanisms
- **Discord Rate Limits**: Queue management and backoff strategies
- **User Input Validation**: Comprehensive sanitization and error messages

### Performance Optimizations
- **Database Indexing**: Optimized queries for large datasets
- **Batch Operations**: Grouped database writes for efficiency
- **Memory Management**: Proper cleanup of Discord resources
- **Connection Pooling**: Efficient database connection reuse

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- [@cxm6467](https://www.github.com/cxm6467)

## 🙏 Acknowledgements

- Project derived from: [MythicMate](https://github.com/Beel12213/MythicMate)
- Raider.IO API for character data integration
- Battle.net API for dynamic dungeon information
- Discord.js community for comprehensive API documentation

