import { ButtonInteraction, Client, ThreadChannel, User } from "discord.js";
import { GroupModel } from "../../models/group";
import { getThreadByMessageId } from "../../utils";
import { MemberRole } from "../../enums";

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
      if ((group?.members ?? []).filter(member => member.role === MemberRole.Damage).length < 3) {
        group?.updateOne({ $push: { members: { role: MemberRole.Damage, userId: user.id } } });
      } else {
        await thread?.send({ content: `Cannot add more DPS members to the group.`});
      }
      await thread?.send({ content: `<@${user.id}> added as DPS`});
      await interaction.deferUpdate();
      console.log('Add Dps button pressed');
      break;
    case 'addHealer':
      if ((group?.members ?? []).filter(member => member.role === MemberRole.Healer).length < 1) {
        group?.updateOne({ $push: { members: { role: MemberRole.Healer, userId: user.id } } });
      } else {
        await thread?.send({ content: `Cannot add more Healers to the group.`});
      }
      await thread?.send({ content: `<@${user.id}> added as Healer`});
      await interaction.deferUpdate();
      console.log('Add Healer button pressed');
      break;
    case 'addTank':
      if ((group?.members ?? []).filter(member => member.role === MemberRole.Tank).length < 1) {
        group?.updateOne({ $push: { members: { role: MemberRole.Tank, userId: user.id } } });
      } else {
        await thread?.send({ content: `Cannot add more Tanks to the group.`});
      }
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
      if (group?.members && Array.isArray(group.members)) {
        group.members = group.members.map(member => {
          if (member.userId === user.id) {
            console.log(`Clearing role for user: ${user.id}`); // Debugging log to verify it's hitting the condition
            member.role = MemberRole.None; // Set the role to None
          }
          return member;
        });
      
        // Save the group after modifying the members' roles
        await group.save();
      } else {
        console.log('Group members not found or invalid');
      }
      await thread?.send({ content: `${user.displayName} wants to clear their role`});
      await interaction.deferUpdate();
      console.log('Add Clear Role button pressed');
      break;   
    default:
      console.log('Unknown button pressed');
  }
}