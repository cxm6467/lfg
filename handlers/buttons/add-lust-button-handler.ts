import { Client, Message, User } from "discord.js";
import { PartyBuffs } from "../../enums";
import { GroupModel } from "../../models/group";
import { updateEmbedField } from "../../services";
import { getMessageByMessageId } from "../../utils";

export const addLustButtonHandler = async (client: Client, groupId: string, user:User) => {
  const group = await GroupModel.findOne({groupId});

  if(group){
    if(!group.hasLust)
    {
      group.hasLust = true;
      await group.save();
      const embedMessage: Message | undefined = await getMessageByMessageId(client, group.messageId ?? '', group.guildId ?? '', group.channelId ?? '');
      await updateEmbedField(embedMessage ?? {} as Message, PartyBuffs.Lust, user.id);
    }
  } else {
    console.log(`Group with id ${groupId} not found`);
  }

}