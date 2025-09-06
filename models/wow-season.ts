import mongoose, { Document, Schema } from 'mongoose';

export interface IWoWSeason extends Document {
	seasonId: number;
	seasonName: string;
	startDate: Date;
	endDate?: Date;
	dungeons: Array<{
		id: number;
		name: string;
		slug: string;
	}>;
	isActive: boolean;
	lastUpdated: Date;
	lastChecked?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const WowSeasonSchema = new Schema<IWoWSeason>({
	seasonId: {
		type: Number,
		required: true,
		unique: true,
		index: true,
	},
	seasonName: {
		type: String,
		required: true,
	},
	startDate: {
		type: Date,
		required: true,
	},
	endDate: {
		type: Date,
		default: null,
	},
	dungeons: [{
		id: {
			type: Number,
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		slug: {
			type: String,
			required: true,
		},
	}],
	isActive: {
		type: Boolean,
		default: true,
		index: true,
	},
	lastUpdated: {
		type: Date,
		default: Date.now,
	},
	lastChecked: {
		type: Date,
		default: null,
	},
}, {
	timestamps: true,
});

export const WowSeasonModel = mongoose.model<IWoWSeason>('WowSeason', WowSeasonSchema);