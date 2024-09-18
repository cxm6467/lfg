import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, MessageActionRowComponentBuilder } from "discord.js";
import { IGroup } from "../../interfaces";
import { getMessageByMessageId } from "../../utils";
import { GroupModel } from "../../models/group";

export const addEmbedButtons = async (client: Client, groupId: string) => {
  const group = await GroupModel.findOne({ groupId });;
  console.log('Adding buttons to embed', { group, client });

  if (group?.embedId && group.guildId && group.channelId) {
    const embedMessage = await getMessageByMessageId(client, group.embedId, group.guildId, group.channelId);
    const embed = embedMessage?.embeds[0]; // Get the first embed in the message

    if (embed) {
      // You can modify the embed if needed
      const updatedEmbed = EmbedBuilder.from(embed);

      // Define the buttons
      const addDps = new ButtonBuilder()
        .setCustomId(`addDps[${group.groupId}]`)
        .setLabel('⚔️')
        .setStyle(ButtonStyle.Primary);

      const addHealer = new ButtonBuilder()
        .setCustomId(`addHealer[${group.groupId}]`)
        .setLabel('💚')
        .setStyle(ButtonStyle.Primary);

      const addTank = new ButtonBuilder()
        .setCustomId(`addTank[${group.groupId}]`)
        .setLabel('🛡️')
        .setStyle(ButtonStyle.Primary);

      const addLust = new ButtonBuilder()
        .setCustomId(`addLust[${group.groupId}]`)
        .setLabel('😡')
        .setStyle(ButtonStyle.Secondary);

      const addBrez = new ButtonBuilder()
        .setCustomId(`addBrez[${group.groupId}]`)
        .setLabel('⚰️')
        .setStyle(ButtonStyle.Secondary);

      const clearRole = new ButtonBuilder()
        .setCustomId(`addClearRole[${group.groupId}]`)
        .setLabel('Clear Role')
        .setStyle(ButtonStyle.Danger);

      const markFinished = new ButtonBuilder()
        .setCustomId(`addFinish[${group.groupId}]`)
        .setLabel('Finish')
        .setStyle(ButtonStyle.Success);

      // Create action rows with buttons
      const rowOne = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(addDps, addHealer, addTank,);

      const rowTwo = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(addLust, addBrez);

      const rowThree = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(clearRole, markFinished);

      // Edit the message to include the buttons (and keep the embed)
      await embedMessage.edit({
        embeds: [updatedEmbed], // Keep the existing embed (or updated embed)
        components: [rowOne, rowTwo, rowThree], // Add buttons below the embed
      });

      console.log('Buttons added successfully.');
    } else {
      console.log('Embed not found in the message.');
    }
  } else {
    console.log('Message ID, Guild ID, or Channel ID not found in group.', {
      embedId: group?.embedId,
      guildId: group?.guildId,
      channelId: group?.channelId,
      messageId: group?.messageId,
    });
  }
};
