import { Client, Message, User } from 'discord.js';
import { IMember } from '../../interfaces';
import { GroupModel } from '../../models/group';
import { getMessageByMessageId } from '../../utils';
import { MemberRole } from '../../enums';
import { updateEmbedField } from '../../services';
export const addDpsButtonHandler = async (client: Client, groupId: string, user: User) => {

	const group = await GroupModel.findOne({ groupId });

	if (group) {
		const groupMember = group.members?.find((member: IMember) => member.userId === user.id);
		if (groupMember) {
			if (groupMember.role === MemberRole.None) {
				if ((group.members?.filter(member => member.role === MemberRole.Damage).length ?? 0) <= 2
          && (group.members?.filter(member => member.userId !== user?.id).length ?? 0) < 1) {
					groupMember.role = MemberRole.Damage;
					await group.save();
					const embedMessage: Message | undefined = await getMessageByMessageId(client, group.messageId ?? '', group.guildId ?? '', group.channelId ?? '');
					await updateEmbedField(embedMessage ?? {} as Message, MemberRole.Damage, user.id);
				}
				else {
					await user.send('You can only have 3 DPS roles in a group.');
				}
			}
			else {
				await user.send('You already have a role in this group.');
			}
		}
		else {
			console.log(`User with id ${user.id} not found in group with id ${groupId}`);
		}
	}
	else {
		console.log(`Group with id ${groupId} not found`);
	}

};