import { Client, Message, User } from 'discord.js';
import { updateEmbedField } from '../../services';
import { getMessageByMessageId } from '../../utils';
import { GroupModel } from '../../models/group';
import { PartyBuffs } from '../../enums';
export const addBresButtonHandler = async (client: Client, groupId: string, user:User) => {
	const group = await GroupModel.findOne({ groupId });

	if (group) {
		if (!group.hasBres) {
			group.hasBres = true;
			await group.save();
			const embedMessage: Message | undefined = await getMessageByMessageId(client, group.messageId ?? '', group.guildId ?? '', group.channelId ?? '');
			await updateEmbedField(embedMessage ?? {} as Message, PartyBuffs.Bres, user.id);
		}
	}
	else {
		console.log(`Group with id ${groupId} not found`);
	}
};