import { Message } from "discord.js";
import { MemberRole, ModalField, PartyBuffs } from "../../enums";

export const updateEmbedField = async (message: Message|undefined, field: MemberRole | PartyBuffs | ModalField, userId: string, value?: string|number) => {
  const embed = message?.embeds[0];

  const roleField = embed?.fields.find(x => x.name.replace(/\*/g, '').trim() === field.toString().replace(/ /g, ''));
  console.log('Role field:', roleField);

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
      case ModalField.StartTime:
        // Convert the value from milliseconds to seconds (if necessary)
        const secondsValue = Math.floor((value as number) / 1000);
        console.log('Setting start time:', secondsValue);

        // Use the secondsValue for the Discord timestamp format
        roleField.value = `<t:${secondsValue}:F>`;
        break;
      case ModalField.Notes:
        roleField.value = value?.toString() ?? '';
        break;
      default:
        return;
    }
  } else {
    console.log('Role field not found', roleField);
  }

  await message?.edit({ embeds: [embed ?? {}] });
}