import { ButtonInteraction, Client, ThreadChannel, User } from "discord.js";
import { GroupModel } from "../../models/group";
import { getThreadByMessageId } from "../../utils";

export const handleButtonInteraction = async (customId: string, groupId:string, user: User, client: Client, interaction:ButtonInteraction) => {
  console.log(`Button interaction received with customId: ${customId} and groupId: ${groupId}`);
  const group = await GroupModel.findOne({ groupId });
  const thread = await getThreadByMessageId(client, group?.threadId ?? '') as ThreadChannel<boolean> | undefined;
  if (!thread) {
    // Handle the case where thread is undefined
    console.log('Thread not found');
    return;
  }
  switch(customId){
    case 'addDps':
      await thread?.send({ content: `<@${user.id}> added as DPS`});
      await interaction.deferUpdate();
      console.log('Add Dps button pressed');
      break;
    case 'addHealer':
      await thread?.send({ content: `<@${user.id}> added as Healer`});
      await interaction.deferUpdate();
      console.log('Add Healer button pressed');
      break;
    case 'addTank':
      await thread?.send({ content: `<@${user.id}> added as Tank`});
      await interaction.deferUpdate();
      console.log('Add Tank button pressed');
      break;
    case 'addLust':
      await thread?.send({ content: `<@${user.id}> added a lust`});
      await interaction.deferUpdate();
      console.log('Add Lust button pressed');
      break;      
    case 'addBrez':
      await thread?.send({ content: `<@${user.id}> added a brez`});
      await interaction.deferUpdate();
      console.log('Add Brez button pressed');
      break;    
    case 'addFinish':
      console.log('Add Finish button pressed');
      await thread?.send({ content: `${user.displayName} wants to finish the group`});
      await interaction.deferUpdate();
      break;
    case 'addClearRole':
      await thread?.send({ content: `${user.displayName} wants to clear their role`});
      await interaction.deferUpdate();
      console.log('Add Clear Role button pressed');
      break;   
    default:
      console.log('Unknown button pressed');
  }
}