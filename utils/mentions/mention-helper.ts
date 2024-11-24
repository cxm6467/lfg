import { DEV_MENTION_CHOICES, DEV_SERVER_ID, SG_DEV_MENTION_CHOICES, SG_DEV_SERVER_ID, SG_PROD_MENTION_CHOICES, SG_PROD_SERVER_ID } from '../../consts';
import { MemberRole, DungeonType } from '../../enums';

// Modify the function to use these types
export const mentionHelper = (serverId: string, role?: MemberRole, difficulty?: DungeonType): string[] | null => {
	console.log(`Comparing serverId: ${serverId} with constants: SG_DEV_SERVER_ID=${SG_DEV_SERVER_ID}, DEV_SERVER_ID=${DEV_SERVER_ID} and SG_PROD_SERVER_ID=${SG_PROD_SERVER_ID}`);

	// Determine the mention choices based on the server ID
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

	// Initialize lists for role and difficulty mentions
	let roleMentions: string[] = [];
	let difficultyMentions: string[] = [];

	// If role is provided, check if it's a valid MemberRole
	console.log(`Role provided: ${role}`);
	if (role) {
		const validRoles = [MemberRole.Tank, MemberRole.Healer, MemberRole.Dps].filter(r => r !== role);
		console.log(`Roles available: ${validRoles}`);


		if (validRoles) {
			// Filter out the provided role and exclude any difficulties
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

	// Combine the lists: role mentions (excluding the provided role) and difficulty mentions
	const mentionsToReturn = [...roleMentions, ...difficultyMentions];

	// Print the mentions for debugging purposes
	console.log(`Filtered role mentions (excluding the provided role and difficulties): ${roleMentions}`);
	console.log(`Difficulty mentions: ${difficultyMentions}`);
	console.log(`Combined mentions: ${mentionsToReturn}`);

	// Return the combined mentions
	return mentionsToReturn;
};