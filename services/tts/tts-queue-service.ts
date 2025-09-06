import { VoiceChannel } from 'discord.js';
import { joinVoiceChannel, VoiceConnectionStatus, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
const say = require('say');
import * as fs from 'fs';
import * as path from 'path';

interface TTSJob {
  id: string;
  voiceChannel: VoiceChannel;
  messages: string[];
  groupName: string;
  priority: number; // Higher number = higher priority
  createdAt: Date;
}

interface VoiceConnection {
  channelId: string;
  connection: any;
  player: any;
  isBusy: boolean;
  currentJob?: TTSJob;
}

/**
 * Service to manage TTS queue across multiple voice channels
 */
export class TTSQueueService {
  private static instance: TTSQueueService;
  private queue: TTSJob[] = [];
  private activeConnections: Map<string, VoiceConnection> = new Map();
  private isProcessing = false;
  private readonly MAX_CONCURRENT_TTS = 3; // Maximum concurrent TTS operations
  private readonly JOB_TIMEOUT = 60000; // 1 minute timeout per job

  private constructor() {}

  static getInstance(): TTSQueueService {
    if (!TTSQueueService.instance) {
      TTSQueueService.instance = new TTSQueueService();
    }
    return TTSQueueService.instance;
  }

  /**
   * Add a TTS job to the queue
   */
  async addTTSJob(
    voiceChannel: VoiceChannel,
    messages: string[],
    groupName: string,
    priority: number = 1
  ): Promise<string> {
    const jobId = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: TTSJob = {
      id: jobId,
      voiceChannel,
      messages,
      groupName,
      priority,
      createdAt: new Date()
    };

    // Insert job in priority order (higher priority first)
    const insertIndex = this.queue.findIndex(queuedJob => queuedJob.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    logger(LogLevel.INFO, `🎤 Added TTS job ${jobId} to queue (priority: ${priority}, position: ${this.queue.indexOf(job) + 1})`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Process the TTS queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    logger(LogLevel.INFO, `🎤 Starting TTS queue processing (${this.queue.length} jobs in queue)`);

    while (this.queue.length > 0) {
      // Check if we can start more TTS operations
      const activeCount = Array.from(this.activeConnections.values()).filter(conn => conn.isBusy).length;
      
      if (activeCount >= this.MAX_CONCURRENT_TTS) {
        // Wait for a connection to become available
        await this.waitForAvailableConnection();
        continue;
      }

      const job = this.queue.shift();
      if (!job) break;

      // Check if job has timed out
      if (Date.now() - job.createdAt.getTime() > this.JOB_TIMEOUT) {
        logger(LogLevel.WARN, `⚠️ TTS job ${job.id} timed out, skipping`);
        continue;
      }

      // Process the job
      this.processTTSJob(job).catch(error => {
        logger(LogLevel.ERROR, `❌ Failed to process TTS job ${job.id}: ${error.message}`);
      });
    }

    this.isProcessing = false;
    logger(LogLevel.INFO, `🎤 TTS queue processing completed`);
  }

  /**
   * Process a single TTS job
   */
  private async processTTSJob(job: TTSJob): Promise<void> {
    const connectionKey = job.voiceChannel.id;
    
    try {
      logger(LogLevel.INFO, `🎤 Processing TTS job ${job.id} for group ${job.groupName}`);

      // Get or create voice connection
      let voiceConnection = this.activeConnections.get(connectionKey);
      
      if (!voiceConnection) {
        voiceConnection = await this.createVoiceConnection(job.voiceChannel);
        this.activeConnections.set(connectionKey, voiceConnection);
      }

      // Mark connection as busy
      voiceConnection.isBusy = true;
      voiceConnection.currentJob = job;

      // Process TTS messages
      await this.playTTSMessages(voiceConnection, job);

      // Mark connection as available
      voiceConnection.isBusy = false;
      voiceConnection.currentJob = undefined;

      logger(LogLevel.INFO, `✅ Completed TTS job ${job.id} for group ${job.groupName}`);

    } catch (error) {
      logger(LogLevel.ERROR, `❌ Failed to process TTS job ${job.id}: ${(error as Error).message}`);
      
      // Mark connection as available even on error
      const voiceConnection = this.activeConnections.get(connectionKey);
      if (voiceConnection) {
        voiceConnection.isBusy = false;
        voiceConnection.currentJob = undefined;
      }
    }
  }

  /**
   * Create a voice connection for a channel
   */
  private async createVoiceConnection(voiceChannel: VoiceChannel): Promise<VoiceConnection> {
    logger(LogLevel.INFO, `🔌 Creating voice connection for channel ${voiceChannel.id}`);

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    // Handle connection events
    connection.on(VoiceConnectionStatus.Ready, () => {
      logger(LogLevel.INFO, `✅ Voice connection ready for channel ${voiceChannel.id}`);
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      logger(LogLevel.INFO, `🔌 Voice connection disconnected from channel ${voiceChannel.id}`);
      this.activeConnections.delete(voiceChannel.id);
    });

    connection.on('error', (error) => {
      logger(LogLevel.ERROR, `❌ Voice connection error for channel ${voiceChannel.id}: ${error.message}`);
      this.activeConnections.delete(voiceChannel.id);
    });

    return {
      channelId: voiceChannel.id,
      connection,
      player,
      isBusy: false
    };
  }

  /**
   * Play TTS messages for a job
   */
  private async playTTSMessages(voiceConnection: VoiceConnection, job: TTSJob): Promise<void> {
    for (let i = 0; i < job.messages.length; i++) {
      const message = job.messages[i];
      const delay = i === 0 ? 0 : 1000; // 1 second delay between messages

      await this.playTTSMessage(voiceConnection, message, delay);
    }
  }

  /**
   * Play a single TTS message
   */
  private async playTTSMessage(voiceConnection: VoiceConnection, message: string, delay: number = 0): Promise<void> {
    try {
      logger(LogLevel.DEBUG, `🎤 TTS: ${message}`);

      // Generate TTS audio file
      const audioFileName = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`;
      const audioFilePath = path.join(__dirname, '../../temp', audioFileName);

      // Ensure temp directory exists
      const tempDir = path.dirname(audioFilePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Generate TTS audio using platform-specific approach
      await new Promise<void>((resolve, reject) => {
        // Try different TTS approaches based on platform
        const platform = process.platform;
        
        if (platform === 'win32') {
          // Windows TTS
          say.export(message, 'Microsoft Zira Desktop', 1.0, audioFilePath, (err: any) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } else if (platform === 'darwin') {
          // macOS TTS
          say.export(message, 'Alex', 1.0, audioFilePath, (err: any) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          // Linux/WSL - try multiple TTS options with better voices
          logger(LogLevel.INFO, `TTS on ${platform}, trying available options...`);
          
          const { exec } = require('child_process');
          
          // Try espeak with different voice options (in order of preference)
          const voiceOptions = [
            'en-us',    // US English - clearer
            'en-gb',    // British English - smoother
            'en',       // Default English
            'en-uk-rp'  // Received Pronunciation - very clear
          ];
          
          const tryNextVoice = (voiceIndex: number) => {
            if (voiceIndex >= voiceOptions.length) {
              logger(LogLevel.WARN, `All espeak voices failed, using text-only mode`);
              resolve();
              return;
            }
            
            const voice = voiceOptions[voiceIndex];
            logger(LogLevel.DEBUG, `Trying espeak voice: ${voice}`);
            
            exec(`espeak -s 150 -v ${voice} "${message}" -w "${audioFilePath}"`, (espeakError: any) => {
              if (espeakError) {
                logger(LogLevel.DEBUG, `espeak voice ${voice} failed: ${espeakError.message}`);
                tryNextVoice(voiceIndex + 1);
              } else {
                logger(LogLevel.INFO, `Successfully used espeak voice: ${voice}`);
                resolve();
              }
            });
          };
          
          exec('which espeak', (error: any) => {
            if (!error) {
              tryNextVoice(0);
            } else {
              // Try festival as backup
              exec('which festival', (festivalError: any) => {
                if (!festivalError) {
                  exec(`echo "${message}" | festival --tts --pipe > "${audioFilePath}"`, (festivalTtsError: any) => {
                    if (festivalTtsError) {
                      logger(LogLevel.WARN, `festival TTS failed: ${festivalTtsError.message}`);
                      resolve(); // Skip TTS
                    } else {
                      logger(LogLevel.INFO, `Successfully used festival TTS`);
                      resolve();
                    }
                  });
                } else {
                  // No TTS available, skip audio generation
                  logger(LogLevel.INFO, `No TTS engines available on ${platform}, using text-only mode`);
                  resolve();
                }
              });
            }
          });
        }
      });

      // Wait for the specified delay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Check if audio file was created before trying to play it
      if (fs.existsSync(audioFilePath)) {
        // Play the audio file
        const audioResource = createAudioResource(audioFilePath);
        voiceConnection.player.play(audioResource);
      } else {
        // No audio file generated (platform doesn't support TTS)
        logger(LogLevel.INFO, `🎤 TTS: ${message} (text-only on ${process.platform})`);
        // Just wait a bit to simulate the audio duration
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Wait for audio to finish playing (only if we played audio)
      if (fs.existsSync(audioFilePath)) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 5000); // 5 second timeout
          
          voiceConnection.player.on(AudioPlayerStatus.Idle, () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }

      // Clean up the audio file
      try {
        if (fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
      } catch (cleanupError) {
        logger(LogLevel.WARN, `Failed to cleanup TTS audio file: ${(cleanupError as Error).message}`);
      }

    } catch (error) {
      logger(LogLevel.WARN, `Failed to play TTS message: ${(error as Error).message}`);
    }
  }

  /**
   * Wait for an available connection
   */
  private async waitForAvailableConnection(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const activeCount = Array.from(this.activeConnections.values()).filter(conn => conn.isBusy).length;
        if (activeCount < this.MAX_CONCURRENT_TTS) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000); // Check every second
    });
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    activeConnections: number;
    busyConnections: number;
    jobs: Array<{
      id: string;
      groupName: string;
      priority: number;
      createdAt: Date;
    }>;
  } {
    const busyConnections = Array.from(this.activeConnections.values()).filter(conn => conn.isBusy).length;
    
    return {
      queueLength: this.queue.length,
      activeConnections: this.activeConnections.size,
      busyConnections,
      jobs: this.queue.map(job => ({
        id: job.id,
        groupName: job.groupName,
        priority: job.priority,
        createdAt: job.createdAt
      }))
    };
  }

  /**
   * Cancel a TTS job
   */
  cancelTTSJob(jobId: string): boolean {
    const jobIndex = this.queue.findIndex(job => job.id === jobId);
    if (jobIndex !== -1) {
      this.queue.splice(jobIndex, 1);
      logger(LogLevel.INFO, `🗑️ Cancelled TTS job ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all TTS jobs
   */
  clearQueue(): void {
    this.queue = [];
    logger(LogLevel.INFO, `🗑️ Cleared TTS queue`);
  }

  /**
   * Disconnect all voice connections
   */
  async disconnectAll(): Promise<void> {
    logger(LogLevel.INFO, `🔌 Disconnecting all voice connections`);
    
    for (const [channelId, voiceConnection] of this.activeConnections) {
      try {
        voiceConnection.connection.destroy();
      } catch (error) {
        logger(LogLevel.WARN, `Failed to disconnect from channel ${channelId}: ${(error as Error).message}`);
      }
    }
    
    this.activeConnections.clear();
  }
}
