import mongoose from "mongoose";
import { IWoWGroup } from "../../interfaces/IWoWGroup";
import { GroupSchema } from "../../schemas/GroupSchema";

export const GroupModel = mongoose.model<IWoWGroup>('Group', GroupSchema, 'group');