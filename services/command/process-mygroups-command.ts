import { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GroupModel } from '../../models/group';
import { EmbedStatusService } from '../embed/embed-status-service';
import { IGroup, IMember } from '../../interfaces';
import { MemberRole } from '../../enums';

/**
 * Processes the mygroups command interaction by showing all groups the user is currently participating in.
 *
 * @param interaction - The interaction object from the mygroups command.
 * @returns A promise that resolves when the user's groups list has been sent.
 */
export const processMyGroupsCommand = async (interaction: ChatInputCommandInteraction) => {
	try {
		// Find all active groups where the user is a member
		const groups = await GroupModel.find({
			guildId: interaction.guildId,
			archived: { $ne: true },
			'members.userId': interaction.user.id,
		});

		if (groups.length === 0) {
			await interaction.reply({
				content: 'You are not currently participating in any active groups.',
				flags: 64, // ephemeral
			});
			return;
		}

		// Show first group (index 0)
		await showMyGroupPage(interaction, groups, 0);
	}
	catch (error) {
		await interaction.reply({
			content: `Failed to fetch your groups: ${(error as Error).message}`,
			flags: 64, // ephemeral
		});
	}
};

/**
 * Show a specific my group page with pagination
 */
export async function showMyGroupPage(
	interaction: ChatInputCommandInteraction | any, 
	groups: IGroup[], 
	pageIndex: number
) {
	const group = groups[pageIndex];
	if (!group) return;

	const members = group.members || [];
	const currentUser = interaction.user;

	// Find current user's role in this group
	const userMember = members.find((m: IMember) => m.userId === currentUser.id);
	const userCurrentRole = userMember?.role || 'Unknown';

	// Count current roles
	const tankCount = members.filter((m: IMember) => m.role === MemberRole.Tank).length;
	const healerCount = members.filter((m: IMember) => m.role === MemberRole.Healer).length;
	const dpsCount = members.filter((m: IMember) => m.role === MemberRole.Dps).length;

	// Calculate open slots (or if user can switch to this role)
	const tankSlots = Math.max(0, 1 - tankCount);
	const healerSlots = Math.max(0, 1 - healerCount);
	const dpsSlots = Math.max(0, 3 - dpsCount);

	// Check if user can join/switch to each role
	const canJoinTank = tankSlots > 0 || userCurrentRole === MemberRole.Tank;
	const canJoinHealer = healerSlots > 0 || userCurrentRole === MemberRole.Healer;
	const canJoinDps = dpsSlots > 0 || userCurrentRole === MemberRole.Dps;

	// Build role availability text
	let rolesText = '';
	if (canJoinTank) {
		const status = userCurrentRole === MemberRole.Tank ? ' (Your Role)' : tankSlots > 0 ? ` (${tankSlots} open)` : ' (Switch)';
		rolesText += `🛡️ Tank${status}\n`;
	}
	if (canJoinHealer) {
		const status = userCurrentRole === MemberRole.Healer ? ' (Your Role)' : healerSlots > 0 ? ` (${healerSlots} open)` : ' (Switch)';
		rolesText += `💚 Healer${status}\n`;
	}
	if (canJoinDps) {
		const status = userCurrentRole === MemberRole.Dps ? ' (Your Role)' : dpsSlots > 0 ? ` (${dpsSlots} open)` : ' (Switch)';
		rolesText += `⚔️ DPS${status}\n`;
	}

	// Build current members text
	let membersText = '';
	if (tankCount > 0) {
		const tankMembers = members.filter((m: IMember) => m.role === MemberRole.Tank);
		membersText += `🛡️ **Tank:** ${tankMembers.map((m: IMember) => `<@${m.userId}>`).join(', ')}\n`;
	}
	if (healerCount > 0) {
		const healerMembers = members.filter((m: IMember) => m.role === MemberRole.Healer);
		membersText += `💚 **Healer:** ${healerMembers.map((m: IMember) => `<@${m.userId}>`).join(', ')}\n`;
	}
	if (dpsCount > 0) {
		const dpsMembers = members.filter((m: IMember) => m.role === MemberRole.Dps);
		membersText += `⚔️ **DPS:** ${dpsMembers.map((m: IMember) => `<@${m.userId}>`).join(', ')}\n`;
	}

	const startTime = EmbedStatusService.getFormattedStartTime(group.startTime);
	const dungeonInfo = group.dungeon ? `**Dungeon:** ${group.dungeon.name}${group.dungeon.level ? ` (Level ${group.dungeon.level})` : ''}\n` : '';
	const totalMembers = members.length;

	// Build additional info
	let additionalInfo = `**Your Role:** ${userCurrentRole}\n**Members:** ${totalMembers}/5\n**Start:** ${startTime}`;
	
	// Add voice channel link if available
	if (group.voiceChannelId) {
		additionalInfo += `\n**Voice:** <#${group.voiceChannelId}>`;
	}
	
	// Add embed link if available
	if (group.embedId && group.channelId) {
		additionalInfo += `\n**Group:** [View Embed](https://discord.com/channels/${group.guildId}/${group.channelId}/${group.embedId})`;
	}

	// Create embed
	const embed = new EmbedBuilder()
		.setColor('#00FF00')
		.setTitle(`🎮 ${group.groupName}`)
		.setDescription(`**ID:** \`${group.groupId.substring(0, 8)}\`\n${dungeonInfo}${additionalInfo}`)
		.addFields([
			{
				name: '📋 Available Roles',
				value: rolesText || 'No available roles',
				inline: true
			},
			{
				name: '👥 Current Members',
				value: membersText || 'No members yet',
				inline: true
			}
		])
		.setFooter({ 
			text: `Your Group ${pageIndex + 1} of ${groups.length} • Click buttons to switch roles` 
		})
		.setTimestamp();

	// Add notes if available
	if (group.notes) {
		embed.addFields({
			name: '📝 Notes',
			value: group.notes,
			inline: false
		});
	}

	// Create action rows
	const actionRows: ActionRowBuilder<ButtonBuilder>[] = [];

	// Role buttons row
	const roleRow = new ActionRowBuilder<ButtonBuilder>();
	if (canJoinTank) {
		const tankButton = new ButtonBuilder()
			.setCustomId(`join-tank[${group.groupId}]`)
			.setLabel(userCurrentRole === MemberRole.Tank ? '🛡️ Tank (Current)' : '🛡️ Tank')
			.setStyle(userCurrentRole === MemberRole.Tank ? ButtonStyle.Secondary : ButtonStyle.Primary);
		roleRow.addComponents(tankButton);
	}

	if (canJoinHealer) {
		const healerButton = new ButtonBuilder()
			.setCustomId(`join-healer[${group.groupId}]`)
			.setLabel(userCurrentRole === MemberRole.Healer ? '💚 Healer (Current)' : '💚 Healer')
			.setStyle(userCurrentRole === MemberRole.Healer ? ButtonStyle.Secondary : ButtonStyle.Success);
		roleRow.addComponents(healerButton);
	}

	if (canJoinDps) {
		const dpsButton = new ButtonBuilder()
			.setCustomId(`join-dps[${group.groupId}]`)
			.setLabel(userCurrentRole === MemberRole.Dps ? '⚔️ DPS (Current)' : '⚔️ DPS')
			.setStyle(userCurrentRole === MemberRole.Dps ? ButtonStyle.Secondary : ButtonStyle.Secondary);
		roleRow.addComponents(dpsButton);
	}

	if (roleRow.components.length > 0) {
		actionRows.push(roleRow);
	}

	// Leave group button
	const leaveButton = new ButtonBuilder()
		.setCustomId(`leave-group[${group.groupId}]`)
		.setLabel('🚪 Leave Group')
		.setStyle(ButtonStyle.Danger);
	
	const leaveRow = new ActionRowBuilder<ButtonBuilder>();
	leaveRow.addComponents(leaveButton);
	actionRows.push(leaveRow);

	// Navigation buttons row (only if more than 1 group)
	if (groups.length > 1) {
		const navRow = new ActionRowBuilder<ButtonBuilder>();
		
		const prevButton = new ButtonBuilder()
			.setCustomId(`mygroups-prev[${pageIndex}]`)
			.setLabel('⬅️ Previous')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(pageIndex === 0);
		navRow.addComponents(prevButton);

		const nextButton = new ButtonBuilder()
			.setCustomId(`mygroups-next[${pageIndex}]`)
			.setLabel('Next ➡️')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(pageIndex === groups.length - 1);
		navRow.addComponents(nextButton);

		actionRows.push(navRow);
	}

	// Send or update the message
	if (interaction.replied || interaction.deferred) {
		await interaction.editReply({ 
			embeds: [embed], 
			components: actionRows
		});
	} else {
		await interaction.reply({ 
			embeds: [embed], 
			components: actionRows,
			flags: 64 // ephemeral
		});
	}
}