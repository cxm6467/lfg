import { ButtonInteraction, ThreadChannel, User } from "discord.js";
import { Document } from "mongoose";
import { MemberRole } from "../../enums";

export const clearRoleButtonHandler = async (interaction: ButtonInteraction, group: Document, user: User, thread:ThreadChannel) => {
  const userMember = group.get("members").find((member: { userId: string; role: string; }) => member.userId === user.id);
  
  if (!userMember || !Object.values(MemberRole).includes(userMember.role) || userMember.role === MemberRole.None) {
    await user.send("You don't have a role in this group.");
    return;
  } else {
    userMember.role = MemberRole.None;
    group.set("members", group.get("members").map((member: { userId: string; role: string; }) => {
      if (member.userId === user.id) {
        return userMember;
      }
      return member;
    }));
    await group.save();
    // update embed
    // await user.send(`Your role has been cleared for group ${group.get("groupName")}.`);
  }
}