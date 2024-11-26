import { DEV_MENTION_CHOICES, DEV_SERVER_ID, SG_DEV_MENTION_CHOICES, SG_DEV_SERVER_ID, SG_PROD_MENTION_CHOICES, SG_PROD_SERVER_ID } from '../../consts';
import { MemberRole, DungeonType } from '../../enums';

/**
 * A helper function to determine the mentions to use based on the server ID, role, and difficulty.
 *
 * @param serverId The server ID to compare against the constants.
 * @param role The role to exclude from the mentions.
 * @param difficulty The difficulty to include in the mentions.
 * @returns An array of mentions to use.
 */
export const mentionHelper = (serverId: string, role?: MemberRole, difficulty?: DungeonType): string[] | null => {
	console.log(`Comparing serverId: ${serverId} with constants: SG_DEV_SERVER_ID=${SG_DEV_SERVER_ID}, DEV_SERVER_ID=${DEV_SERVER_ID} and SG_PROD_SERVER_ID=${SG_PROD_SERVER_ID}`);

	let mentionChoices: Record<string, string> = {};
	switch (String(serverId)) {
	case String(SG_DEV_SERVER_ID):
		mentionChoices = SG_DEV_MENTION_CHOICES;
		break;
	case String(SG_PROD_SERVER_ID):
		mentionChoices = SG_PROD_MENTION_CHOICES;
		break;
	case String(DEV_SERVER_ID):
		mentionChoices = DEV_MENTION_CHOICES;
		break;
	default:
		return null;
	}

	let roleMentions: string[] = [];
	let difficultyMentions: string[] = [];

	console.log(`Role provided: ${role}`);
	if (role) {
		const validRoles = [MemberRole.Tank, MemberRole.Healer, MemberRole.Dps].filter(r => r !== role);
		console.log(`Roles available: ${validRoles}`);


		if (validRoles) {
			roleMentions = validRoles.map(r => mentionChoices[`${r.toLowerCase()}_role`]).filter(Boolean);
		}
		else {
			console.log(`No role mentions found for: ${validRoles}`);
		}
	}

	// If difficulty is provided, check if it's a valid DungeonType
	if (difficulty) {
		const difficultyKey = `${difficulty.toLowerCase()}_role`;
		const difficultyMention = mentionChoices[difficultyKey];

		if (difficultyMention) {
			difficultyMentions = [difficultyMention];
		}
		else {
			console.log(`No difficulty mention found for key: ${difficultyKey}`);
		}
	}

	const mentionsToReturn = [...roleMentions, ...difficultyMentions];

	console.log(`Filtered role mentions (excluding the provided role and difficulties): ${roleMentions}`);
	console.log(`Difficulty mentions: ${difficultyMentions}`);
	console.log(`Combined mentions: ${mentionsToReturn}`);

	return mentionsToReturn;
};