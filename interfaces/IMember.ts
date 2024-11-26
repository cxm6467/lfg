import { MemberRole } from '../enums/';

export interface IMember {
  userId?: string;
  role: MemberRole;
  hasLust?: boolean;
  hasBres?: boolean;
}