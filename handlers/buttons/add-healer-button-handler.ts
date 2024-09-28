import { Client, Embed, User } from "discord.js";
import { MemberRole } from "../../enums";
import { IMember } from "../../interfaces";
import { GroupModel } from "../../models/group";
import { getMessageByMessageId } from "../../utils";

export const addHealerButtonHandler = async (client: Client, groupId: string, user: User) => {
  const group = await GroupModel.findOne({groupId});
  const userMember = (group?.members ?? []).find((member: IMember) => member.userId === user.id);

  if (!(group?.members ?? []).some((member: IMember) => member.role === MemberRole.Healer)) {
    if (userMember) {
      userMember.role = MemberRole.Healer;
      await group?.save();
    }
  } else {
    await user.send("You can only have 1 Healer role in a group.");
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
  const roleField = embed.fields.find(field => field.name.replace(/\*/g, '').trim() === MemberRole.Healer);
  console.log('Role field found:', roleField);
  if (roleField) {
    roleField.value = `${(group?.members ?? []).filter(member => member.role === MemberRole.Healer).map(member => `<@${member.userId}>`).join(', ') || 'None'}`;
  } else {
    console.log('Role field not found');
  }

  await embedMessage.edit({ embeds: [embed] });
}