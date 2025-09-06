import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { LogLevel } from '../../enums';
import { logger } from '../../utils';
import { TTSQueueService } from '../tts/tts-queue-service';

/**
 * Process the /tts-status command - Show TTS queue status
 */
export async function processTTSStatusCommand(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		await interaction.deferReply({ ephemeral: true });

		logger(LogLevel.INFO, `🎤 [TTS Status] User ${interaction.user.tag} checking TTS queue status`);

		const ttsQueue = TTSQueueService.getInstance();
		const status = ttsQueue.getQueueStatus();

		const embed = new EmbedBuilder()
			.setColor('#00FF00')
			.setTitle('🎤 TTS Queue Status')
			.setDescription('Current status of the TTS queue system')
			.addFields([
				{
					name: 'Queue Length',
					value: `${status.queueLength} jobs waiting`,
					inline: true
				},
				{
					name: 'Active Connections',
					value: `${status.activeConnections} voice channels connected`,
					inline: true
				},
				{
					name: 'Busy Connections',
					value: `${status.busyConnections} currently playing TTS`,
					inline: true
				}
			])
			.setTimestamp();

		// Add queued jobs if any
		if (status.jobs.length > 0) {
			const jobList = status.jobs
				.slice(0, 10) // Show first 10 jobs
				.map(job => `**${job.groupName}** (Priority: ${job.priority})`)
				.join('\n');

			embed.addFields({
				name: 'Queued Jobs',
				value: jobList || 'None',
				inline: false
			});

			if (status.jobs.length > 10) {
				embed.addFields({
					name: 'Note',
					value: `... and ${status.jobs.length - 10} more jobs`,
					inline: false
				});
			}
		}

		await interaction.editReply({ embeds: [embed] });

		logger(LogLevel.INFO, `✅ [TTS Status] TTS queue status displayed for user ${interaction.user.tag}`);

	} catch (error) {
		await interaction.editReply({
			content: '❌ An error occurred while checking TTS status.'
		});
		logger(LogLevel.ERROR, `❌ [TTS Status] Failed to process tts-status command: ${(error as Error).message}`);
	}
}
