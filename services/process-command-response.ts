import { IGroup } from "../interfaces";
import { v4 as uuidv4 } from 'uuid';
import { addModal } from "./add-modal";
import { DungeonName, DungeonType, MemberRole } from "../enums";
import { ChatInputCommandInteraction, CommandInteraction, Interaction } from "discord.js";

export const processInteractionResponse = async (interaction: ChatInputCommandInteraction) => { 

  const difficulty = interaction.options.get('difficulty')?.value;
  const dungeon = interaction.options.get('dungeon')?.value;
  const level = interaction.options.get('level')?.value;
  const role = interaction.options.get('role')?.value;
  const groupName = `Group for: ${dungeon} ${difficulty} ${level}`;

  const group: IGroup = {
    groupId: uuidv4(),
    groupName,
    dungeon: {
      name : dungeon as DungeonName,
      type: difficulty as DungeonType,
      level: level as number
    },
    members: [
      {
        role: role as MemberRole,
        userId: interaction.user.id,
      }
    ],
    guildId: interaction.guildId ?? '',
    channelId: interaction.channelId,
  }

  await addModal(interaction, group);

  return;
}