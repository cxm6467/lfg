import { MemberRole } from '../../enums';
import { IMember } from '../../interfaces';

export const doesMemberHaveRole = (member:IMember, role: MemberRole) => {
	return member.role === role;
};