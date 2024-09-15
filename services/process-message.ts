import { IWoWGroup } from "../interfaces";
import { GroupModel } from "../models/group";
import { v4 as uuidv4 } from 'uuid';

export const processResponse = async (interaction: any) => { 

  const difficulty = interaction.options.getString('difficulty');
  const dungeon = interaction.options.getString('dungeon');
  const level = interaction.options.getString('level');
  const role = interaction.options.getString('role');

  // Do something with the options
  const message = await interaction.reply(`Processing LFM request:
  Difficulty: ${difficulty}
  Dungeon: ${dungeon}
  Level: ${level}
  Role: ${role}
  message: ${interaction.id}
  guild: ${interaction.guildId}
  channel: ${interaction.channelId}`);

  const group: IWoWGroup = {
    groupId: uuidv4(),
    groupName: `${dungeon} ${difficulty} ${level}`,
    dungeon: {
      name : dungeon,
      type: difficulty,
      level: level
    },
    members: [
      {
        role: role,
        userId: interaction.user.id,
      }
    ],
    messageId: message.id.toString(),
    guildId: interaction.guildId.toString(),
    channelId: interaction.channelId.toString(),
  }

  await GroupModel.create(group);

  return;
}