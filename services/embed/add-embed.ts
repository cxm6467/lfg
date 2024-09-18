import { Client, EmbedBuilder, StartThreadOptions } from "discord.js";
import { GroupModel } from "../../models/group";
import { getMessageByMessageId } from "../../utils";

export const addEmbed = async (client: Client, groupId: string) => {
  const group = await GroupModel.findOne({ groupId });
  
  if (group?.groupId && group.guildId && group.channelId && group.messageId) {
    console.log('Group found:', group);

    const msg = await getMessageByMessageId(client, group.messageId, group.guildId, group.channelId);
    console.log('Message found:', msg);

    const embed = new EmbedBuilder()
      .setTitle(group.groupName || 'Group Name')
      .addFields([
        { 
          name: 'Dungeon', 
          value: group.dungeon?.name && group.dungeon?.type && group.dungeon?.level 
            ? `${group.dungeon.name} ${group.dungeon.type} ${group.dungeon.level}` 
            : 'N/A' 
        },
        { 
          name: 'Members', 
          value: group.members && group.members.length > 0 
            ? group.members.map(member => `<@${member.userId}> - ${member.role}`).join('\n') 
            : 'No members yet.' 
        },
        { 
          name: 'Notes', 
          value: group.notes || 'No notes available.' 
        }
      ]);

    console.log('Embed created:', embed);

    const embedMessage = await msg?.edit({ embeds: [embed]  });
    console.log('Embed message edited:', embedMessage);
    const thread = await msg?.startThread(
      {
      name: group.groupName || 'Group Name',
      autoArchiveDuration: 60,
      reason: 'Group thread started by the bot',
      type: 'private' // Set thread to private
      } as StartThreadOptions
    );
    await group.updateOne({ embedId: embedMessage?.id, threadId: thread?.id });
    console.log('Group updated:', group);
  } else {
    console.error('Group not found');
  }
};