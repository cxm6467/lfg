# WoW LFG Bot - Optimization & Best Practices Guide

This document outlines optimization strategies, best practices, and performance considerations for the WoW LFG Discord Bot.

## 🚀 Performance Optimizations

### Database Optimization

#### MongoDB Indexing
```javascript
// Recommended indexes for optimal performance
db.group.createIndex({ "groupId": 1 }, { unique: true })
db.group.createIndex({ "guildId": 1, "startTime": 1 })
db.group.createIndex({ "members.userId": 1 })
db.group.createIndex({ "archived": 1, "cleanedUp": 1 })

db.user.createIndex({ "discordUserId": 1 }, { unique: true })
db.user.createIndex({ "mainCharacter.name": 1, "mainCharacter.realm": 1 })

db.guildconfig.createIndex({ "guildId": 1 }, { unique: true })
db.guildconfig.createIndex({ "linkedGuilds.guildId": 1 })

db.season.createIndex({ "isCurrent": 1 })
db.season.createIndex({ "seasonId": 1 }, { unique: true })
```

#### Query Optimization
- **Use Projection**: Only fetch required fields
  ```typescript
  const groups = await GroupModel.find({ guildId }, { 
    groupId: 1, groupName: 1, startTime: 1, members: 1 
  });
  ```

- **Batch Operations**: Group database operations
  ```typescript
  // Instead of multiple individual updates
  await GroupModel.updateMany(
    { groupId: { $in: expiredGroupIds } },
    { archived: true, archivedAt: new Date() }
  );
  ```

- **Connection Pooling**: Configure MongoDB connection pool
  ```typescript
  mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  ```

### API Rate Limiting & Caching

#### Raider.IO API Optimization
```typescript
// Implement request queuing and rate limiting
class RaiderIOAPIService {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private readonly RATE_LIMIT = 100; // requests per minute
  private requestCount = 0;
  private lastReset = Date.now();

  async getCharacterProfile(region: string, realm: string, name: string) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          await this.enforceRateLimit();
          const result = await this.makeRequest(region, realm, name);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async enforceRateLimit() {
    const now = Date.now();
    if (now - this.lastReset > 60000) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    
    if (this.requestCount >= this.RATE_LIMIT) {
      const waitTime = 60000 - (now - this.lastReset);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requestCount++;
  }
}
```

#### Battle.net API Caching
```typescript
// Implement intelligent caching for Battle.net API
class BattleNetAPIService {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  async getDungeonData() {
    const cacheKey = 'dungeon-data';
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    const data = await this.fetchFromAPI();
    this.cache.set(cacheKey, {
      data,
      expiry: Date.now() + this.CACHE_DURATION
    });
    
    return data;
  }
}
```

### Memory Management

#### Event Listener Cleanup
```typescript
// Properly clean up event listeners
class BotService {
  private eventListeners = new Map<string, Function>();

  addEventListener(event: string, handler: Function) {
    this.eventListeners.set(event, handler);
    this.client.on(event, handler);
  }

  cleanup() {
    for (const [event, handler] of this.eventListeners) {
      this.client.off(event, handler);
    }
    this.eventListeners.clear();
  }
}
```

#### Memory Leak Prevention
```typescript
// Use WeakMap for object references
class GroupManager {
  private groupReferences = new WeakMap<object, GroupData>();
  
  // Avoid circular references
  private cleanupGroupReferences(groupId: string) {
    // Remove all references to prevent memory leaks
    this.groupReferences.delete(this.getGroupObject(groupId));
  }
}
```

## 🔧 Code Quality & Best Practices

### TypeScript Best Practices

#### Strict Type Safety
```typescript
// Use strict type definitions
interface IGroupMember {
  readonly userId: string;
  readonly role: MemberRole;
  readonly hasBres: boolean;
  readonly hasLust: boolean;
  readonly joinedAt: Date;
}

// Use type guards for runtime safety
function isGroupMember(obj: any): obj is IGroupMember {
  return obj && 
    typeof obj.userId === 'string' && 
    Object.values(MemberRole).includes(obj.role);
}
```

#### Error Handling Patterns
```typescript
// Consistent error handling
class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

// Use Result pattern for operations that can fail
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function safeOperation<T>(
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### Discord.js Optimization

#### Efficient Embed Management
```typescript
// Batch embed updates
class EmbedManager {
  private updateQueue = new Map<string, EmbedBuilder>();
  private updateTimer?: NodeJS.Timeout;

  queueUpdate(messageId: string, embed: EmbedBuilder) {
    this.updateQueue.set(messageId, embed);
    
    if (!this.updateTimer) {
      this.updateTimer = setTimeout(() => {
        this.processUpdates();
      }, 1000); // Batch updates every second
    }
  }

  private async processUpdates() {
    const updates = Array.from(this.updateQueue.entries());
    this.updateQueue.clear();
    this.updateTimer = undefined;

    await Promise.allSettled(
      updates.map(([messageId, embed]) => 
        this.updateMessage(messageId, embed)
      )
    );
  }
}
```

#### Voice Channel Management
```typescript
// Efficient voice channel operations
class VoiceChannelManager {
  private readonly MAX_CONCURRENT_MOVES = 5;
  private moveQueue: Array<() => Promise<void>> = [];

  async moveUsersToChannel(userIds: string[], channelId: string) {
    // Batch user moves to avoid rate limits
    const batches = this.chunkArray(userIds, this.MAX_CONCURRENT_MOVES);
    
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(userId => this.moveUser(userId, channelId))
      );
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## 🛡️ Security Best Practices

### Input Validation
```typescript
// Comprehensive input validation
class InputValidator {
  static validateBattleTag(battleTag: string): boolean {
    const pattern = /^[a-zA-Z0-9\u00C0-\u017F]+#[0-9]{4,5}$/;
    return pattern.test(battleTag) && battleTag.length <= 20;
  }

  static validateCharacterName(name: string): boolean {
    const pattern = /^[a-zA-Z0-9\u00C0-\u017F\s'-]{2,12}$/;
    return pattern.test(name);
  }

  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .substring(0, 100); // Limit length
  }
}
```

### Permission Management
```typescript
// Robust permission checking
class PermissionManager {
  static async checkAdminPermission(
    interaction: ChatInputCommandInteraction
  ): Promise<boolean> {
    if (!interaction.memberPermissions) return false;
    
    return interaction.memberPermissions.has([
      PermissionFlagsBits.Administrator
    ]);
  }

  static async checkChannelPermission(
    channel: TextChannel,
    permissions: PermissionFlagsBits[]
  ): Promise<boolean> {
    const botMember = await channel.guild.members.fetch(
      channel.client.user!.id
    );
    
    return botMember.permissionsIn(channel).has(permissions);
  }
}
```

## 📊 Monitoring & Logging

### Structured Logging
```typescript
// Comprehensive logging system
interface LogContext {
  userId?: string;
  guildId?: string;
  groupId?: string;
  operation?: string;
  duration?: number;
  error?: Error;
}

class Logger {
  static log(level: LogLevel, message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    };

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(logEntry, null, 2));
    }

    // Send to external logging service in production
    if (process.env.LOGTAIL_SOURCE_TOKEN) {
      this.sendToLogtail(logEntry);
    }
  }

  static async sendToLogtail(logEntry: any) {
    try {
      await axios.post('https://in.logtail.com', logEntry, {
        headers: {
          'Authorization': `Bearer ${process.env.LOGTAIL_SOURCE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to send log to Logtail:', error);
    }
  }
}
```

### Performance Monitoring
```typescript
// Performance tracking
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(operation: string): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  private recordMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const values = this.metrics.get(operation)!;
    values.push(duration);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getAverageTime(operation: string): number {
    const values = this.metrics.get(operation) || [];
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
```

## 🔄 Deployment Best Practices

### Environment Configuration
```typescript
// Environment validation
class EnvironmentValidator {
  static validate(): void {
    const required = [
      'DISCORD_BOT_TOKEN',
      'DISCORD_BOT_APP_ID',
      'PROD_MONGO_URI'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}
```

### Health Checks
```typescript
// Application health monitoring
class HealthChecker {
  static async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    checks: Record<string, boolean>;
  }> {
    const checks = {
      database: await this.checkDatabase(),
      discord: await this.checkDiscord(),
      apis: await this.checkAPIs()
    };

    const allHealthy = Object.values(checks).every(check => check);
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks
    };
  }

  private static async checkDatabase(): Promise<boolean> {
    try {
      await mongoose.connection.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}
```

## 🚀 Scaling Considerations

### Horizontal Scaling
- **Stateless Design**: Ensure bot can run multiple instances
- **Database Sharding**: Consider sharding by guild ID for large deployments
- **Load Balancing**: Use multiple bot instances with shared database

### Vertical Scaling
- **Memory Optimization**: Monitor memory usage and implement cleanup
- **CPU Optimization**: Use worker threads for CPU-intensive operations
- **Connection Pooling**: Optimize database and API connections

## 📈 Performance Metrics

### Key Performance Indicators (KPIs)
- **Response Time**: < 2 seconds for most commands
- **Memory Usage**: < 512MB per bot instance
- **Database Query Time**: < 100ms for simple queries
- **API Response Time**: < 1 second for external APIs
- **Error Rate**: < 1% for all operations

### Monitoring Tools
- **Application Performance Monitoring**: New Relic, DataDog, or similar
- **Database Monitoring**: MongoDB Atlas monitoring
- **Log Aggregation**: Logtail, ELK Stack, or similar
- **Uptime Monitoring**: Pingdom, UptimeRobot, or similar

## 🔧 Maintenance Best Practices

### Regular Maintenance Tasks
1. **Database Cleanup**: Archive old groups and user data
2. **Cache Invalidation**: Clear stale cached data
3. **Log Rotation**: Manage log file sizes
4. **Dependency Updates**: Keep packages up to date
5. **Performance Reviews**: Analyze metrics and optimize

### Backup Strategies
- **Database Backups**: Daily automated backups
- **Configuration Backups**: Version control for all configs
- **Disaster Recovery**: Tested recovery procedures

This guide should be regularly updated as the bot evolves and new optimization opportunities are identified.
