import { SG_DEV_SERVER_ID, SG_PROD_SERVER_ID } from "../../consts";
import { MemberRole, DungeonType, DEV_MENTION_CHOICES, PROD_MENTION_CHOICES } from "../../enums";

// Modify the function to use these types
export const  mentionHelper = (serverId: string, role?: MemberRole, difficulty?: DungeonType): string[] | null => {
  console.log(`Comparing serverId: ${serverId} with constants: SG_DEV_SERVER_ID=${SG_DEV_SERVER_ID} and SG_PROD_SERVER_ID=${SG_PROD_SERVER_ID}`);

  // Determine the mention choices based on the server ID
  let mentionChoices: Record<string, string> = {};
  if (String(serverId) === String(SG_DEV_SERVER_ID)) {
      mentionChoices = DEV_MENTION_CHOICES;
  } else if (String(serverId) === String(SG_PROD_SERVER_ID)) {
      mentionChoices = PROD_MENTION_CHOICES;
  } else {
      return null;
  }

  // Initialize lists for role and difficulty mentions
  let roleMentions: string[] = [];
  let difficultyMentions: string[] = [];

  // If role is provided, check if it's a valid MemberRole
  if (role) {
      const roleKey = `${role.toLowerCase()}_role`;
      const roleMention = mentionChoices[roleKey];

      if (roleMention) {
          // Filter out the provided role and exclude any difficulties
          roleMentions = Object.entries(mentionChoices)
              .filter(([key]) => key.toLowerCase() !== roleKey && Object.values(MemberRole).some(validRole => key.toLowerCase().includes(validRole)))
              .map(([, mention]) => mention);
      } else {
          console.log(`No role mention found for key: ${roleKey}`);
      }
  }

  // If difficulty is provided, check if it's a valid DungeonType
  if (difficulty) {
      const difficultyKey = `${difficulty.toLowerCase()}_role`;
      const difficultyMention = mentionChoices[difficultyKey];

      if (difficultyMention) {
          difficultyMentions = [difficultyMention];
      } else {
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
}