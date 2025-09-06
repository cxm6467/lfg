import jwt from 'jsonwebtoken';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { config } from '../config';

interface IGuildFederation {
	federationId: string;
	name: string;
	description?: string;
	memberGuilds: string[];
	createdBy: string;
	isActive: boolean;
	settings: {
		allowCrossGuildGroups: boolean;
		sharePlayerStats: boolean;
		requireApproval: boolean;
		maxGuilds: number;
	};
	createdAt: Date;
	updatedAt: Date;
}

interface IFederationRequest {
	requestId: string;
	fromGuildId: string;
	toFederationId: string;
	requestType: 'join' | 'invite' | 'leave';
	message?: string;
	status: 'pending' | 'approved' | 'rejected';
	createdAt: Date;
}

interface ICrossGuildEvent {
	eventId: string;
	hostGuildId: string;
	participatingGuilds: string[];
	federationId: string;
	title: string;
	description?: string;
	scheduledTime: Date;
	maxParticipants: number;
	currentParticipants: string[];
	requirements?: {
		minLevel?: number;
		requiredRoles?: string[];
		minReliabilityScore?: number;
	};
}

export class FederationService {
	private static instance: FederationService;
	private federations: Map<string, IGuildFederation> = new Map();
	private requests: Map<string, IFederationRequest> = new Map();
	private crossGuildEvents: Map<string, ICrossGuildEvent> = new Map();

	private constructor() {}

	static getInstance(): FederationService {
		if (!FederationService.instance) {
			FederationService.instance = new FederationService();
		}
		return FederationService.instance;
	}

	async createFederation(creatorGuildId: string, name: string, description?: string): Promise<string | null> {
		try {
			const federationId = this.generateFederationId();
			
			const federation: IGuildFederation = {
				federationId,
				name,
				description,
				memberGuilds: [creatorGuildId],
				createdBy: creatorGuildId,
				isActive: true,
				settings: {
					allowCrossGuildGroups: true,
					sharePlayerStats: false,
					requireApproval: true,
					maxGuilds: 10,
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			this.federations.set(federationId, federation);
			logger(LogLevel.INFO, `Created federation ${federationId} by guild ${creatorGuildId}`);
			return federationId;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error creating federation: ${config.sanitizeForLogging(error)}`);
			return null;
		}
	}

	async requestToJoinFederation(guildId: string, federationId: string, message?: string): Promise<boolean> {
		try {
			const federation = this.federations.get(federationId);
			if (!federation || !federation.isActive) {
				return false;
			}

			if (federation.memberGuilds.includes(guildId)) {
				return false; // Already a member
			}

			if (federation.memberGuilds.length >= federation.settings.maxGuilds) {
				return false; // Federation full
			}

			const requestId = this.generateRequestId();
			const request: IFederationRequest = {
				requestId,
				fromGuildId: guildId,
				toFederationId: federationId,
				requestType: 'join',
				message,
				status: 'pending',
				createdAt: new Date(),
			};

			this.requests.set(requestId, request);
			
			if (!federation.settings.requireApproval) {
				await this.approveRequest(requestId);
			}

			logger(LogLevel.INFO, `Guild ${guildId} requested to join federation ${federationId}`);
			return true;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error requesting to join federation: ${config.sanitizeForLogging(error)}`);
			return false;
		}
	}

	async approveRequest(requestId: string): Promise<boolean> {
		try {
			const request = this.requests.get(requestId);
			if (!request || request.status !== 'pending') {
				return false;
			}

			const federation = this.federations.get(request.toFederationId);
			if (!federation) {
				return false;
			}

			if (request.requestType === 'join') {
				federation.memberGuilds.push(request.fromGuildId);
				federation.updatedAt = new Date();
				this.federations.set(federation.federationId, federation);
			}

			request.status = 'approved';
			this.requests.set(requestId, request);

			logger(LogLevel.INFO, `Approved request ${requestId} for guild ${request.fromGuildId} to join federation ${request.toFederationId}`);
			return true;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error approving request: ${config.sanitizeForLogging(error)}`);
			return false;
		}
	}

	async rejectRequest(requestId: string): Promise<boolean> {
		try {
			const request = this.requests.get(requestId);
			if (!request || request.status !== 'pending') {
				return false;
			}

			request.status = 'rejected';
			this.requests.set(requestId, request);

			logger(LogLevel.INFO, `Rejected request ${requestId}`);
			return true;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error rejecting request: ${config.sanitizeForLogging(error)}`);
			return false;
		}
	}

	async leaveFederation(guildId: string, federationId: string): Promise<boolean> {
		try {
			const federation = this.federations.get(federationId);
			if (!federation) {
				return false;
			}

			const memberIndex = federation.memberGuilds.indexOf(guildId);
			if (memberIndex === -1) {
				return false; // Not a member
			}

			federation.memberGuilds.splice(memberIndex, 1);
			federation.updatedAt = new Date();

			if (federation.memberGuilds.length === 0) {
				federation.isActive = false;
			}

			this.federations.set(federationId, federation);
			logger(LogLevel.INFO, `Guild ${guildId} left federation ${federationId}`);
			return true;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error leaving federation: ${config.sanitizeForLogging(error)}`);
			return false;
		}
	}

	async createCrossGuildEvent(
		hostGuildId: string,
		federationId: string,
		title: string,
		scheduledTime: Date,
		maxParticipants: number,
		options?: {
			description?: string;
			participatingGuilds?: string[];
			requirements?: ICrossGuildEvent['requirements'];
		}
	): Promise<string | null> {
		try {
			const federation = this.federations.get(federationId);
			if (!federation || !federation.memberGuilds.includes(hostGuildId)) {
				return null;
			}

			if (!federation.settings.allowCrossGuildGroups) {
				return null;
			}

			const eventId = this.generateEventId();
			const participatingGuilds = options?.participatingGuilds || federation.memberGuilds;

			const event: ICrossGuildEvent = {
				eventId,
				hostGuildId,
				participatingGuilds,
				federationId,
				title,
				description: options?.description,
				scheduledTime,
				maxParticipants,
				currentParticipants: [],
				requirements: options?.requirements,
			};

			this.crossGuildEvents.set(eventId, event);
			logger(LogLevel.INFO, `Created cross-guild event ${eventId} by guild ${hostGuildId}`);
			return eventId;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error creating cross-guild event: ${config.sanitizeForLogging(error)}`);
			return null;
		}
	}

	async joinCrossGuildEvent(eventId: string, userId: string, guildId: string): Promise<boolean> {
		try {
			const event = this.crossGuildEvents.get(eventId);
			if (!event) {
				return false;
			}

			if (!event.participatingGuilds.includes(guildId)) {
				return false;
			}

			if (event.currentParticipants.includes(userId)) {
				return false; // Already joined
			}

			if (event.currentParticipants.length >= event.maxParticipants) {
				return false; // Event full
			}

			event.currentParticipants.push(userId);
			this.crossGuildEvents.set(eventId, event);

			logger(LogLevel.INFO, `User ${userId} from guild ${guildId} joined cross-guild event ${eventId}`);
			return true;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error joining cross-guild event: ${config.sanitizeForLogging(error)}`);
			return false;
		}
	}

	generateFederationToken(federationId: string, guildId: string): string | null {
		try {
			const federation = this.federations.get(federationId);
			if (!federation || !federation.memberGuilds.includes(guildId)) {
				return null;
			}

			const jwtSecret = process.env.JWT_SECRET;
			if (!jwtSecret) {
				logger(LogLevel.ERROR, 'JWT_SECRET not configured');
				return null;
			}

			const payload = {
				federationId,
				guildId,
				permissions: this.getFederationPermissions(federationId, guildId),
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
			};

			return jwt.sign(payload, jwtSecret);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error generating federation token: ${config.sanitizeForLogging(error)}`);
			return null;
		}
	}

	verifyFederationToken(token: string): { federationId: string; guildId: string; permissions: string[] } | null {
		try {
			const jwtSecret = process.env.JWT_SECRET;
			if (!jwtSecret) {
				return null;
			}

			const decoded = jwt.verify(token, jwtSecret) as any;
			return {
				federationId: decoded.federationId,
				guildId: decoded.guildId,
				permissions: decoded.permissions || [],
			};
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error verifying federation token: ${config.sanitizeForLogging(error)}`);
			return null;
		}
	}

	getFederation(federationId: string): IGuildFederation | null {
		return this.federations.get(federationId) || null;
	}

	getFederationsByGuild(guildId: string): IGuildFederation[] {
		return Array.from(this.federations.values()).filter(fed => 
			fed.memberGuilds.includes(guildId) && fed.isActive
		);
	}

	getPendingRequests(federationId: string): IFederationRequest[] {
		return Array.from(this.requests.values()).filter(req => 
			req.toFederationId === federationId && req.status === 'pending'
		);
	}

	getCrossGuildEvents(federationId: string, guildId?: string): ICrossGuildEvent[] {
		return Array.from(this.crossGuildEvents.values()).filter(event => {
			if (event.federationId !== federationId) return false;
			if (guildId && !event.participatingGuilds.includes(guildId)) return false;
			return event.scheduledTime > new Date();
		});
	}

	private getFederationPermissions(federationId: string, guildId: string): string[] {
		const federation = this.federations.get(federationId);
		if (!federation) return [];

		const permissions: string[] = ['view_federation'];

		if (federation.createdBy === guildId) {
			permissions.push('manage_federation', 'approve_requests', 'create_events');
		} else {
			permissions.push('create_events', 'join_events');
		}

		return permissions;
	}

	private generateFederationId(): string {
		return `fed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateEventId(): string {
		return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}