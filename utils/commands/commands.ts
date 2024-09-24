import { SlashCommandBuilder } from "discord.js";
import { DungeonName, DungeonType, MemberRole, RangeChoices } from "../../enums";

export const commands = [
  new SlashCommandBuilder()
    .setName('lfm')
    .setDescription('Looking for more command')
    .addStringOption(option =>
      option.setName('difficulty')
        .setDescription('The game you are looking for more for')
        .setRequired(true)
        .addChoices(
          ...Object.values(DungeonType).map(type => ({
            name: type,
            value: type
          }))
        )
    )
    .addStringOption(option =>
      option.setName('dungeon')
        .setDescription('The dungeon you are looking for')
        .setRequired(true)
        .addChoices(
          ...Object.values(DungeonName).map(dungeon => ({
            name: dungeon,
            value: dungeon
          }))
        )
    )
    .addStringOption(option =>
      option.setName('level')
        .setDescription('The level you are looking to complete')
        .setRequired(true)
        .addChoices(...RangeChoices)
    )
    .addStringOption(option =>
      option.setName('role')
        .setDescription('The role you are looking to fill')
        .setRequired(true)
        .addChoices(
          ...Object.values(MemberRole)
            .filter(role => role !== MemberRole.None)
            .map(role => ({
              name: role,
              value: role
            }))
        )
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('lfd')
    .setDescription('Looking for deez command')
    .addStringOption(option =>
      option.setName('difficulty')
        .setDescription('The game you are looking for more for')
        .setRequired(true)
        .addChoices(
          ...Object.values(DungeonType).map(dungeon => ({
            name: dungeon,
            value: dungeon
          }))
        )
    )
    .addStringOption(option =>
      option.setName('dungeon')
        .setDescription('The dungeon you are looking for')
        .setRequired(true)
        .addChoices(
          ...Object.values(DungeonName).map(dungeon => ({
            name: dungeon,
            value: dungeon
          }))
        )
    )
    .addStringOption(option =>
      option.setName('level')
        .setDescription('The level you are looking to complete')
        .setRequired(true)
        .addChoices(...RangeChoices)
    )
    .addStringOption(option =>
      option.setName('role')
        .setDescription('The role you are looking to fill')
        .setRequired(true)
        .addChoices(
          ...Object.values(MemberRole)
            .filter(role => role !== MemberRole.None)
            .map(role => ({
              name: role,
              value: role
            }))
        )
    )
    .toJSON()
];