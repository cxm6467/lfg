import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DungeonName, DungeonType, MemberRole } from '../../enums';

/**
 * Processes the help command interaction by sending an embed with all available commands and their descriptions.
 *
 * @param interaction - The interaction object from the help command.
 * @returns A promise that resolves when the help message has been sent.
 */
export const processHelpCommand = async (interaction: ChatInputCommandInteraction) => {
	const helpEmbed = new EmbedBuilder()
		.setColor('#0099FF')
		.setTitle('🎮 LFG Bot Help')
		.setDescription('Here are all the available commands:')
		.addFields(
			{
				name: '/lfm',
				value: '**Looking for More** - Create a group to find more players for dungeons\n' +
					   '• `difficulty`: Game difficulty (Normal, Heroic, Mythic, Delve)\n' +
					   '• `dungeon`: Dungeon name\n' +
					   '• `level`: Level range or mythic+ key level\n' +
					   '• `role`: Role you need to fill (Tank, Healer, DPS)',
				inline: false,
			},
			{
				name: '/join',
				value: '**Join Group** - Join a specific group with a role\n' +
					   '• `group_id`: ID of the group to join\n' +
					   '• `role`: Your desired role (Tank, Healer, DPS)',
				inline: false,
			},
			{
				name: '/leave',
				value: '**Leave Group** - Leave a group and clear your role\n' +
					   '• `group_id`: ID of the group to leave',
				inline: false,
			},
			{
				name: '/groups',
				value: '**List Groups** - Show all active groups with open slots',
				inline: false,
			},
			{
				name: '/mygroups',
				value: '**My Groups** - Show groups you are currently participating in',
				inline: false,
			},
			{
				name: '/help',
				value: '**Help** - Show this help message with all available commands',
				inline: false,
			},
			{
				name: '/set-battletag',
				value: '**Set BattleTag** - Link your Battle.net BattleTag to your Discord account\n' +
					   '• `battletag`: Your BattleTag in format Name#1234',
				inline: false,
			},
			{
				name: '/set-main',
				value: '**Set Main Character** - Set your main character for Raider.IO integration\n' +
					   '• `character`: Your main character name\n' +
					   '• `realm`: Your character\'s realm\n' +
					   '• `region`: Your character\'s region (US, EU, KR, TW)',
				inline: false,
			},
			{
				name: '/profile',
				value: '**View Profile** - View your profile with Raider.IO M+ score and raid progress',
				inline: false,
			},
			{
				name: '/refresh-profile',
				value: '**Refresh Profile** - Update your Raider.IO data with latest scores and progress',
				inline: false,
			},
			{
				name: '/set-lfm-channel',
				value: '**Set LFM Channel** - Configure the channel for LFG posts in this server\n' +
					   '• `channel`: The text channel to use for LFG messages',
				inline: false,
			},
			{
				name: '/link-guild',
				value: '**Link Guild** - Connect this server with another Discord server for cross-posting\n' +
					   '• `guild_id`: The Discord server ID to link with\n' +
					   '• `guild_name`: Name of the server\n' +
					   '• `include_voice_channels`: Include voice channel links (optional)\n' +
					   '• `include_raid_progress`: Include raid progress (optional)\n' +
					   '• `include_mythic_plus_score`: Include M+ scores (optional)\n' +
					   '• `custom_message`: Custom message for cross-posts (optional)',
				inline: false,
			},
			{
				name: '/unlink-guild',
				value: '**Unlink Guild** - Disconnect from a linked Discord server\n' +
					   '• `guild_id`: The Discord server ID to unlink from',
				inline: false,
			},
			{
				name: '/guild-config',
				value: '**Guild Configuration** - View this server\'s settings and linked servers',
				inline: false,
			},
			{
				name: '/cleanup',
				value: '**🧹 Cleanup** - Admin only: Delete all bot messages, threads, and embeds in this channel\n' +
					   '⚠️ **WARNING**: This will permanently delete all bot content in the current channel!',
				inline: false,
			},
			{
				name: '🎯 Available Difficulties',
				value: Object.values(DungeonType).join(', '),
				inline: false,
			},
			{
				name: '🏰 Available Dungeons',
				value: Object.values(DungeonName).slice(0, 8).join(', ') + (Object.values(DungeonName).length > 8 ? ', ...' : ''),
				inline: false,
			},
			{
				name: '👥 Available Roles',
				value: Object.values(MemberRole).filter(role => role !== MemberRole.None).join(', '),
				inline: false,
			},
		)
		.setFooter({ text: 'Use the buttons on group posts to join, leave, or manage groups. Set your main character to see M+ scores and raid progress!' })
		.setTimestamp();

	await interaction.reply({ embeds: [helpEmbed], flags: 64 }); // 64 = ephemeral flag
};