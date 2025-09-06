import { LogLevel } from '../../enums';
import { logger } from '../../utils';
import { FALLBACK_IMAGES } from '../../consts';

/**
 * Service to handle image fallbacks when primary images fail
 */
export class ImageFallbackService {
	/**
	 * Get a fallback image URL based on dungeon type
	 */
	static getFallbackImage(dungeonType?: string): string {
		logger(LogLevel.DEBUG, `Getting fallback image for dungeon type: ${dungeonType}`);

		switch (dungeonType?.toLowerCase()) {
			case 'mythic+':
			case 'mythic plus':
			case 'm+':
				return FALLBACK_IMAGES.MYTHIC_PLUS;
			case 'raid':
				return FALLBACK_IMAGES.RAID;
			case 'dungeon':
			default:
				return FALLBACK_IMAGES.GENERIC_DUNGEON;
		}
	}

	/**
	 * Get the default fallback image
	 */
	static getDefaultFallback(): string {
		return FALLBACK_IMAGES.DEFAULT;
	}

	/**
	 * Validate if an image URL is accessible (basic URL validation)
	 */
	static isValidImageUrl(url: string): boolean {
		if (!url || url.trim() === '') {
			return false;
		}

		// Basic URL validation
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get image URL with fallback logic
	 */
	static getImageWithFallback(primaryUrl: string, dungeonType?: string): string {
		logger(LogLevel.DEBUG, `Getting image with fallback - Primary: ${primaryUrl}, Type: ${dungeonType}`);

		// If primary URL is valid, use it
		if (this.isValidImageUrl(primaryUrl)) {
			logger(LogLevel.DEBUG, `Using primary image URL: ${primaryUrl}`);
			return primaryUrl;
		}

		// Otherwise, use fallback
		const fallbackUrl = this.getFallbackImage(dungeonType);
		logger(LogLevel.WARN, `Primary image URL invalid, using fallback: ${fallbackUrl}`);
		return fallbackUrl;
	}
}
