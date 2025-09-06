import { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GroupModel } from '../../models/group';
import { MemberRole } from '../../enums';
import { EmbedStatusService } from '../embed/embed-status-service';
import { GroupFilterService, GroupFilters } from '../filter/group-filter-service';
import { ErrorHandlerService } from '../error/error-handler-service';
import { IGroup, IMember } from '../../interfaces';

/**
 * Processes the groups command interaction by showing all active groups with open slots.
 *
 * @param interaction - The interaction object from the groups command.
 * @returns A promise that resolves when the groups list has been sent.
 */
export const processGroupsCommand = async (interaction: ChatInputCommandInteraction) => {
	try {
		// Extract filter options
		const levelRange = interaction.options.getString('level_range');
		const customLevelRange = interaction.options.getString('custom_level_range');
		const dungeonFilter = interaction.options.getString('dungeon');
		const roleFilter = interaction.options.getString('role') as MemberRole | null;

		// Build filters object
		const filters: GroupFilters = {};

		// Handle level range filter
		if (levelRange === 'custom:' && customLevelRange) {
			// Validate custom level range format
			if (!GroupFilterService.validateCustomLevelRange(`custom:${customLevelRange}`)) {
				await interaction.reply({
					content: '❌ Invalid custom level range format. Please use format: `min-max` (e.g., `3-7`). Range must be 0-20.',
					flags: 64, // ephemeral
				});
				return;
			}
			filters.levelRange = `custom:${customLevelRange}`;
		} else if (levelRange && levelRange !== 'custom:') {
			filters.levelRange = levelRange;
		}

		// Handle dungeon filter
		if (dungeonFilter) {
			filters.dungeon = dungeonFilter;
		}

		// Handle role filter
		if (roleFilter) {
			filters.role = roleFilter;
		}

		// Find all active (non-archived) groups in this guild
		const allGroups = await GroupModel.find({
			guildId: interaction.guildId,
			archived: { $ne: true },
		});

		// Apply filters
		const groups = GroupFilterService.filterGroups(allGroups, filters);

		if (groups.length === 0) {
			const filterText = Object.keys(filters).length > 0 
				? ' matching your filters' 
				: '';
			await interaction.reply({
				content: `No active groups found${filterText} in this server.`,
				flags: 64, // ephemeral
			});
			return;
		}

		// Show first group (index 0)
		await showGroupPage(interaction, groups, 0, filters);
	}
	catch (error) {
		await interaction.reply({
			content: `Failed to fetch groups: ${(error as Error).message}`,
			flags: 64, // ephemeral
		});
	}
};

/**
 * Show a specific group page with pagination
 */
export async function showGroupPage(
	interaction: ChatInputCommandInteraction | any, 
	groups: IGroup[], 
	pageIndex: number, 
	filters: GroupFilters
) {
	const group = groups[pageIndex];
	if (!group) return;

	const members = group.members || [];
	const currentUser = interaction.user;

	// Check if current user is already in this group
	const userMember = members.find((m: IMember) => m.userId === currentUser.id);
	const userCurrentRole = userMember?.role;

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
	const userStatus = userCurrentRole ? `\n**Your Role:** ${userCurrentRole}` : '';

	// Create embed
	const embed = new EmbedBuilder()
		.setColor('#0099FF')
		.setTitle(`🏰 ${group.groupName}`)
		.setDescription(`**ID:** \`${group.groupId.substring(0, 8)}\`\n${dungeonInfo}**Start:** ${startTime}${userStatus}`)
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
			text: `Group ${pageIndex + 1} of ${groups.length} • Click buttons to join/switch roles` 
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

	// Navigation buttons row (only if more than 1 group)
	if (groups.length > 1) {
		const navRow = new ActionRowBuilder<ButtonBuilder>();
		
		const prevButton = new ButtonBuilder()
			.setCustomId(`groups-prev[${pageIndex}]`)
			.setLabel('⬅️ Previous')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(pageIndex === 0);
		navRow.addComponents(prevButton);

		const nextButton = new ButtonBuilder()
			.setCustomId(`groups-next[${pageIndex}]`)
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