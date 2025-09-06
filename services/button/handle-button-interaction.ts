import { ButtonInteraction, Client, ThreadChannel, User } from 'discord.js';
import { GroupModel } from '../../models/group';
import { getThreadByMessageId, logger } from '../../utils';
import { addBresButtonHandler, addDpsButtonHandler, addHealerButtonHandler, addLustButtonHandler, addTankButtonHandler, clearRoleButtonHandler, finishDungeonButtonHandler } from '../../handlers';
import { LogLevel, MemberRole } from '../../enums';
import { ErrorHandlerService } from '../error/error-handler-service';
import { GroupFilterService, GroupFilters } from '../filter/group-filter-service';

/**
 * Handles button interactions for a Discord bot.
 *
 * @param customId - The custom ID of the button that was pressed.
 * @param groupId - The ID of the group associated with the button interaction.
 * @param user - The Discord user who pressed the button.
 * @param client - The Discord client instance.
 * @param interaction - The button interaction instance.
 *
 * This function handles various button interactions by checking the customId
 * and executing the corresponding handler function. It supports the following
 * button interactions:
 * - 'addDps': Adds a DPS role to the user.
 * - 'addHealer': Adds a Healer role to the user.
 * - 'addTank': Adds a Tank role to the user.
 * - 'addLust': Adds a Lust role to the user.
 * - 'addBres': Adds a Bres role to the user.
 * - 'addFinish': Marks the dungeon as finished.
 * - 'addClearRole': Clears the user's role.
 *
 * If the thread associated with the group is not found, the function logs an
 * error message and returns early.
 *
 * Each button interaction is logged to the console for debugging purposes.
 */
export const handleButtonInteraction = async (customId: string, groupId:string, user: User, client: Client, interaction:ButtonInteraction) => {
	logger(LogLevel.INFO, `Button interaction received with customId: ${customId} and groupId: ${groupId}`);
	
	try {
		// Handle new join buttons from groups command
		if (customId.startsWith('join-')) {
			const role = customId.split('-')[1] as MemberRole;
			const actualGroupId = groupId;
			
			// Find the group
			const group = await GroupModel.findOne({ groupId: actualGroupId });
			if (!group) {
				await ErrorHandlerService.handleInteractionError(
					interaction,
					new Error('Group not found'),
					'Group not found. It may have been deleted or completed.'
				);
				return;
			}

			// Check if group has started
			if (group.startTime && new Date() >= group.startTime) {
				await ErrorHandlerService.handleInteractionError(
					interaction,
					new Error('Group has already started'),
					'This group has already started and is no longer accepting new members.'
				);
				return;
			}

			// Check if user already has a role in this group
			const members = group.members ?? [];
			const existingMember = members.find(member => member.userId === user.id);
			const isRoleSwitching = existingMember && existingMember.role !== MemberRole.None && existingMember.role !== undefined;

			logger(LogLevel.INFO, `🔘 [Join Button] User ${user.id} clicking ${role} button for group ${group.groupName}`);
			if (isRoleSwitching) {
				logger(LogLevel.INFO, `🔄 [Join Button] User ${user.id} switching from ${existingMember?.role} to ${role}`);
			} else {
				logger(LogLevel.INFO, `➕ [Join Button] User ${user.id} joining as new ${role}`);
			}

			// Use existing button handlers based on role (they handle role swapping automatically)
			switch (role) {
			case MemberRole.Dps:
				await addDpsButtonHandler(client, actualGroupId, user);
				break;
			case MemberRole.Healer:
				await addHealerButtonHandler(client, actualGroupId, user);
				break;
			case MemberRole.Tank:
				await addTankButtonHandler(client, actualGroupId, user);
				break;
			default:
				await ErrorHandlerService.handleInteractionError(
					interaction,
					new Error('Invalid role'),
					'Invalid role selected.'
				);
				return;
			}

			// Provide appropriate feedback based on whether user was switching roles or joining new
			if (isRoleSwitching) {
				await interaction.reply({
					content: `✅ Successfully switched to **${role}** in group **${group.groupName}**!`,
					flags: 64 // ephemeral
				});
			} else {
				await interaction.reply({
					content: `✅ Successfully joined group **${group.groupName}** as **${role}**!`,
					flags: 64 // ephemeral
				});
			}
			return;
		}

		// Handle pagination buttons for groups command
		if (customId.startsWith('groups-prev') || customId.startsWith('groups-next')) {
			const direction = customId.startsWith('groups-prev') ? 'prev' : 'next';
			const currentPageIndex = parseInt(customId.split('[')[1].split(']')[0]);
			
			logger(LogLevel.INFO, `📄 [Pagination] User ${user.id} navigating ${direction} from page ${currentPageIndex}`);
			
			// Get all groups with current filters (we'll need to store filters in the button or reconstruct them)
			const allGroups = await GroupModel.find({
				guildId: interaction.guildId,
				archived: { $ne: true },
			});

			// For now, we'll show all groups without filters
			// In a production system, you'd want to store the filters in the button customId or use a session store
			const groups = allGroups;
			
			if (groups.length === 0) {
				await ErrorHandlerService.handleInteractionError(
					interaction,
					new Error('No groups found'),
					'No active groups found.'
				);
				return;
			}

			let newPageIndex;
			if (direction === 'prev') {
				newPageIndex = Math.max(0, currentPageIndex - 1);
			} else {
				newPageIndex = Math.min(groups.length - 1, currentPageIndex + 1);
			}

			// Import the showGroupPage function (we'll need to make it exportable)
			const { showGroupPage } = await import('../command/process-groups-command.js');
			await showGroupPage(interaction, groups, newPageIndex, {});
			
			return;
		}

		// Handle existing embed buttons
		const group = await GroupModel.findOne({ groupId });
		const thread = await getThreadByMessageId(client, group?.threadId ?? '') as ThreadChannel<boolean> | undefined;

		if (!thread) {
			logger(LogLevel.ERROR, 'Thread not found');
			await ErrorHandlerService.handleInteractionError(
				interaction,
				new Error('Thread not found'),
				'Group thread not found. The group may have been deleted.'
			);
			return;
		}

		switch (customId) {
		case 'addDps':
			if (group && thread) await addDpsButtonHandler(client, groupId, user);
			await interaction.deferUpdate();
			logger(LogLevel.INFO, 'Add dps button pressed');
			break;
		case 'addHealer':
			if (group && thread) await addHealerButtonHandler(client, groupId, user);
			await interaction.deferUpdate();
			logger(LogLevel.INFO, 'Add Healer button pressed');
			break;
		case 'addTank':
			if (group && thread) await addTankButtonHandler(client, groupId, user);
			await interaction.deferUpdate();
			logger(LogLevel.INFO, 'Add Tank button pressed');
			break;
		case 'addLust':
			if (group && thread) await addLustButtonHandler(client, groupId, user);
			await interaction.deferUpdate();
			logger(LogLevel.INFO, 'Add Lust button pressed');
			break;
		case 'addBres':
			if (group && thread) await addBresButtonHandler(client, groupId, user);
			await interaction.deferUpdate();
			logger(LogLevel.INFO, 'Add Bres button pressed');
			break;
		case 'addFinish':
			if (group && thread) await finishDungeonButtonHandler(client, group, interaction.user);
			await interaction.deferUpdate();
			break;
		case 'addClearRole':
			if (group && thread) await clearRoleButtonHandler(client, groupId, user);
			await interaction.deferUpdate();
			logger(LogLevel.INFO, 'Add Clear Role button pressed');
			break;
		default:
			logger(LogLevel.WARN, 'Unknown button pressed');
			await ErrorHandlerService.handleInteractionError(
				interaction,
				new Error('Unknown button'),
				'Unknown button interaction. Please try again.'
			);
		}
	} catch (error) {
		await ErrorHandlerService.handleInteractionError(
			interaction,
			error as Error,
			'An error occurred while processing your request. Please try again.'
		);
	}
};