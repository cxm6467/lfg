import { MemberRole } from '../../enums';
import { IMember } from '../../interfaces';

/**
 * Checks if a member has a specific role.
 *
 * @param member - The member object to check.
 * @param role - The role to check against the member's role.
 * @returns `true` if the member has the specified role, otherwise `false`.
 */
export const doesMemberHaveRole = (member:IMember, role: MemberRole) => {
	return member.role === role;
};