import { Embed, Message } from "discord.js";
import { MemberRole } from "../../enums";

export const updateEmbedField = async (message: Message, field: MemberRole, userId: string) => {
  const embed = message.embeds[0];

  const roleField = embed.fields.find(x => x.name.replace(/\*/g, '').trim() === field);

  // if (roleField) {
  //   if (roleField.value === MemberRole.None) roleField.value = `${(group?.members ?? []).filter(member => member.role === MemberRole.Damage).map(member => `<@${member.userId}>`).join(', ') || 'None'}`;
  //   roleField.value += `${(group?.members ?? []).filter(member => member.role === MemberRole.Damage).map(member => `\n<@${member.userId}>`).join(', ') || 'None'}`;
  // } else {
  //   console.log('Role field not found');
  // }

  if (roleField) {
    switch (field) {
      case MemberRole.Tank:
        roleField.value = `<@${userId}>`;
        break;
      case MemberRole.Healer:
        roleField.value = `<@${userId}>`;
        break;
      case MemberRole.Damage:
        roleField.value += `\n<@${userId}>`;
        break;
      default:
        return;
    }
  } else {
    console.log('Role field not found');
  }

  await message.edit({ embeds: [embed] });
}