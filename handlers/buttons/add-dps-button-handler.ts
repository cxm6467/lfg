import { Client, Embed, User } from "discord.js";
import { IGroup, IMember } from "../../interfaces";
import { GroupModel } from "../../models/group";
import { getMessageByMessageId } from "../../utils";
import { MemberRole } from "../../enums";
export const addDpsButtonHandler = async (client: Client, groupId: string, user: User) => {
  const group = await GroupModel.findOne({groupId});
  const userMember = (group?.members ?? []).find((member: IMember) => member.userId === user.id);

  if ((group?.members?.filter(member => member.role === MemberRole.Damage).length ?? 0) <= 2) {
    if (userMember) {
      userMember.role = MemberRole.Damage;
      await group?.save();
    }
  } else {
    await user.send("You can only have 2 DPS roles in a group.");
  }


  const embedMessage = await getMessageByMessageId(client, group?.messageId ?? '', group?.guildId ?? '', group?.channelId ?? '');
  if (!embedMessage) {
    await user.send("The message for the embed could not be found.");
    return;
  }

  console.log('Fetching the first embed from the embed message');
  const embed: Embed = embedMessage.embeds[0];
  console.log('Embed fetched:', { fields: embed.fields });

  console.log('Finding the role field in the embed');
  const roleField = embed.fields.find(field => field.name.replace(/\*/g, '').trim() === MemberRole.Damage);
  console.log('Role field found:', roleField);
  if (roleField) {
    roleField.value += `${(group?.members ?? []).filter(member => member.role === MemberRole.Damage).map(member => `\n<@${member.userId}>`).join(', ') || 'None'}`;
  } else {
    console.log('Role field not found');
  }

  await embedMessage.edit({ embeds: [embed] });
  
}