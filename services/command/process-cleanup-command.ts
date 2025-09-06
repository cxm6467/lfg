import { ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js';
import { LogLevel } from '../../enums';
import { logger } from '../../utils';
import { GroupModel } from '../../models/group';
import { ErrorHandlerService } from '../error/error-handler-service';

/**
 * Process the /cleanup command - Admin only command to clean up all bot messages, threads, and embeds
 */
export async function processCleanupCommand(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		// Check if user has administrator permissions
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
			await interaction.reply({
				content: '❌ **Access Denied**\nOnly administrators can use this command.',
				ephemeral: true
			});
			return;
		}

		// Check if channel is a text-based channel
		if (!interaction.channel || 
			(interaction.channel.type !== ChannelType.GuildText && 
			 interaction.channel.type !== ChannelType.GuildAnnouncement)) {
			await interaction.reply({
				content: '❌ **Invalid Channel**\nThis command can only be used in text channels.',
				ephemeral: true
			});
			return;
		}

		await interaction.deferReply({ ephemeral: true });

		logger(LogLevel.INFO, `🧹 [Cleanup] Admin ${interaction.user.tag} (${interaction.user.id}) initiated cleanup in channel ${interaction.channel.id}`);

		let deletedCount = 0;
		let threadCount = 0;
		let embedCount = 0;
		let voiceChannelCount = 0;

		// 1. Delete all bot messages in the channel
		const messages = await interaction.channel.messages.fetch({ limit: 100 });
		const botMessages = messages.filter(msg => msg.author.id === interaction.client.user?.id);
		
		for (const message of botMessages.values()) {
			try {
				await message.delete();
				deletedCount++;
			} catch (error) {
				logger(LogLevel.WARN, `Failed to delete message ${message.id}: ${(error as Error).message}`);
			}
		}

		// 2. Delete all threads in the channel (if it's a text channel)
		if (interaction.channel.type === ChannelType.GuildText) {
			const threads = await interaction.channel.threads.fetchActive();
			for (const thread of threads.threads.values()) {
				try {
					await thread.delete();
					threadCount++;
				} catch (error) {
					logger(LogLevel.WARN, `Failed to delete thread ${thread.id}: ${(error as Error).message}`);
				}
			}

			// Also fetch archived threads
			const archivedThreads = await interaction.channel.threads.fetchArchived();
			for (const thread of archivedThreads.threads.values()) {
				try {
					await thread.delete();
					threadCount++;
				} catch (error) {
					logger(LogLevel.WARN, `Failed to delete archived thread ${thread.id}: ${(error as Error).message}`);
				}
			}
		}

		// 3. Clean up database records for this channel
		const groupsInChannel = await GroupModel.find({ 
			channelId: interaction.channel.id,
			archived: { $ne: true }
		});

		logger(LogLevel.INFO, `🗄️ [Cleanup] Found ${groupsInChannel.length} groups in database for channel ${interaction.channel.id}`);

		for (const group of groupsInChannel) {
			try {
				// Delete voice channel if it exists
				if (group.voiceChannelId) {
					try {
						const voiceChannel = await interaction.guild?.channels.fetch(group.voiceChannelId);
						if (voiceChannel) {
							await voiceChannel.delete();
							voiceChannelCount++;
							logger(LogLevel.DEBUG, `🗑️ [Cleanup] Deleted voice channel ${group.voiceChannelId} for group ${group.groupId}`);
						}
					} catch (error) {
						logger(LogLevel.WARN, `Failed to delete voice channel ${group.voiceChannelId}: ${(error as Error).message}`);
					}
				}

				// Archive the group in database with cleanup metadata
				await GroupModel.updateOne(
					{ groupId: group.groupId },
					{ 
						archived: true,
						archivedAt: new Date(),
						archivedBy: interaction.user.id,
						archivedReason: 'Admin cleanup command',
						// Clear Discord references since they're being deleted
						messageId: null,
						embedId: null,
						threadId: null,
						voiceChannelId: null,
						// Mark as cleaned up
						cleanedUp: true,
						cleanedUpAt: new Date(),
						cleanedUpBy: interaction.user.id
					}
				);
				embedCount++;
				logger(LogLevel.DEBUG, `🗄️ [Cleanup] Archived group ${group.groupId} in database`);
			} catch (error) {
				logger(LogLevel.WARN, `Failed to archive group ${group.groupId}: ${(error as Error).message}`);
			}
		}

		// 4. Get cleanup statistics
		const totalArchivedGroups = await GroupModel.countDocuments({ 
			archived: true,
			cleanedUp: true 
		});
		
		const channelArchivedGroups = await GroupModel.countDocuments({ 
			channelId: interaction.channel.id,
			archived: true,
			cleanedUp: true 
		});

		// 5. Send cleanup summary
		const summary = `🧹 **Cleanup Complete!**

**Discord Content Deleted:**
• ${deletedCount} bot messages
• ${threadCount} threads  
• ${voiceChannelCount} voice channels

**Database Records:**
• ${embedCount} groups archived and marked as cleaned up
• ${channelArchivedGroups} total cleaned groups in this channel
• ${totalArchivedGroups} total cleaned groups across all channels

**Channel:** <#${interaction.channel.id}>
**Cleaned by:** <@${interaction.user.id}>
**Time:** <t:${Math.floor(Date.now() / 1000)}:F>

> 💡 **Note:** All Discord content has been deleted and database records have been properly archived with cleanup metadata.`;

		await interaction.editReply({
			content: summary
		});

		logger(LogLevel.INFO, `✅ [Cleanup] Cleanup completed - Messages: ${deletedCount}, Threads: ${threadCount}, Embeds: ${embedCount}, Voice Channels: ${voiceChannelCount}`);

	} catch (error) {
		await ErrorHandlerService.handleInteractionError(interaction, error as Error, 'cleanup command');
		logger(LogLevel.ERROR, `❌ [Cleanup] Failed to process cleanup command: ${(error as Error).message}`);
	}
}
