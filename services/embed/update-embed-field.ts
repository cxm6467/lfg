import { Embed, Message } from "discord.js";
import { MemberRole, PartyBuffs } from "../../enums";

export const updateEmbedField = async (message: Message|undefined, field: MemberRole | PartyBuffs, userId: string) => {
  const embed = message?.embeds[0];

  const roleField = embed?.fields.find(x => x.name.replace(/\*/g, '').trim() === field);

  if (roleField) {
    switch (field) {
      case MemberRole.Tank:
        roleField.value = `<@${userId}>`;
        break;
      case MemberRole.Healer:
        roleField.value = `<@${userId}>`;
        break;
      case MemberRole.Damage:
        if (roleField.value === 'None') {
          roleField.value = `<@${userId}>`;
        } else if (!roleField.value.includes(`<@${userId}>`)) {
          roleField.value += `\n<@${userId}>`;
        }
        break;
      case PartyBuffs.Brez:
        roleField.value = '✅';
        break;
      case PartyBuffs.Lust:
        roleField.value = '✅';
        break;
      default:
        return;
    }
  } else {
    console.log('Role field not found');
  }

  await message?.edit({ embeds: [embed ?? {}] });
}