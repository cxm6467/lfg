import { ModalSubmitInteraction } from "discord.js";

export const processModalSubmit = async (interaction: ModalSubmitInteraction) => {
  const { customId } = interaction;
  const groupId = customId.match(/\[(.*?)\]/)?.[1];
  if (groupId) {
    const groupMessageId = await interaction.reply({
      content: `Processing your submission for groupId: [${groupId}]`,
    });
    return groupMessageId;
  } else {
    console.log('User ID not found in customId');
  }
}