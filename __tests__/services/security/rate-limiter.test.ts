import { RateLimitService, RATE_LIMIT_CONFIGS } from '../../../services/security/rate-limiter';
import { RateLimitError } from '../../../errors';

describe('RateLimitService', () => {
	let rateLimiter: RateLimitService;

	beforeEach(() => {
		// Create a fresh instance for each test
		(RateLimitService as any).instance = undefined;
		rateLimiter = RateLimitService.getInstance();
	});

	afterEach(() => {
		rateLimiter.shutdown();
	});

	describe('checkRateLimit', () => {
		it('should allow requests within limit', () => {
			const result = rateLimiter.checkRateLimit('user123', 'DEFAULT');
			
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(RATE_LIMIT_CONFIGS.DEFAULT.maxRequests - 1);
		});

		it('should block requests exceeding limit', () => {
			const userId = 'user123';
			const operation = 'DEFAULT';
			const limit = RATE_LIMIT_CONFIGS.DEFAULT.maxRequests;

			// Use up all allowed requests
			for (let i = 0; i < limit; i++) {
				rateLimiter.checkRateLimit(userId, operation);
			}

			// Next request should be blocked
			const result = rateLimiter.checkRateLimit(userId, operation);
			
			expect(result.allowed).toBe(false);
			expect(result.retryAfter).toBeGreaterThan(0);
			expect(result.remaining).toBe(0);
		});

		it('should reset after time window expires', async () => {
			const userId = 'user123';
			const operation = 'DEFAULT';
			const customConfig = {
				windowMs: 100, // 100ms window for testing
				maxRequests: 2,
			};

			// Use up all requests
			rateLimiter.checkRateLimit(userId, operation, customConfig);
			rateLimiter.checkRateLimit(userId, operation, customConfig);

			// Should be blocked
			let result = rateLimiter.checkRateLimit(userId, operation, customConfig);
			expect(result.allowed).toBe(false);

			// Wait for window to expire
			await new Promise(resolve => setTimeout(resolve, 150));

			// Should be allowed again
			result = rateLimiter.checkRateLimit(userId, operation, customConfig);
			expect(result.allowed).toBe(true);
		});

		it('should handle different users independently', () => {
			const operation = 'DEFAULT';
			
			const result1 = rateLimiter.checkRateLimit('user1', operation);
			const result2 = rateLimiter.checkRateLimit('user2', operation);
			
			expect(result1.allowed).toBe(true);
			expect(result2.allowed).toBe(true);
			expect(result1.remaining).toBe(result2.remaining);
		});

		it('should handle different operations independently', () => {
			const userId = 'user123';
			
			const result1 = rateLimiter.checkRateLimit(userId, 'DEFAULT');
			const result2 = rateLimiter.checkRateLimit(userId, 'GROUP_CREATION');
			
			expect(result1.allowed).toBe(true);
			expect(result2.allowed).toBe(true);
		});
	});

	describe('enforceRateLimit', () => {
		it('should not throw when within limit', () => {
			expect(() => {
				rateLimiter.enforceRateLimit('user123', 'DEFAULT');
			}).not.toThrow();
		});

		it('should throw RateLimitError when limit exceeded', () => {
			const userId = 'user123';
			const operation = 'DEFAULT';
			const limit = RATE_LIMIT_CONFIGS.DEFAULT.maxRequests;

			// Use up all allowed requests
			for (let i = 0; i < limit; i++) {
				rateLimiter.enforceRateLimit(userId, operation);
			}

			// Next request should throw
			expect(() => {
				rateLimiter.enforceRateLimit(userId, operation);
			}).toThrow(RateLimitError);
		});
	});

	describe('resetRateLimit', () => {
		it('should reset rate limit for specific user and operation', () => {
			const userId = 'user123';
			const operation = 'DEFAULT';
			const limit = RATE_LIMIT_CONFIGS.DEFAULT.maxRequests;

			// Use up all requests
			for (let i = 0; i < limit; i++) {
				rateLimiter.checkRateLimit(userId, operation);
			}

			// Should be blocked
			let result = rateLimiter.checkRateLimit(userId, operation);
			expect(result.allowed).toBe(false);

			// Reset and should be allowed
			rateLimiter.resetRateLimit(userId, operation);
			result = rateLimiter.checkRateLimit(userId, operation);
			expect(result.allowed).toBe(true);
		});
	});

	describe('getRateLimitStatus', () => {
		it('should return null for unused combinations', () => {
			const status = rateLimiter.getRateLimitStatus('user123', 'DEFAULT');
			expect(status).toBeNull();
		});

		it('should return correct status after usage', () => {
			const userId = 'user123';
			const operation = 'DEFAULT';
			
			rateLimiter.checkRateLimit(userId, operation);
			rateLimiter.checkRateLimit(userId, operation);
			
			const status = rateLimiter.getRateLimitStatus(userId, operation);
			expect(status).toBeDefined();
			expect(status!.count).toBe(2);
			expect(status!.remaining).toBe(RATE_LIMIT_CONFIGS.DEFAULT.maxRequests - 2);
			expect(status!.resetTime).toBeGreaterThan(Date.now());
		});
	});

	describe('getStats', () => {
		it('should return correct statistics', () => {
			rateLimiter.checkRateLimit('user1', 'DEFAULT');
			rateLimiter.checkRateLimit('user1', 'GROUP_CREATION');
			rateLimiter.checkRateLimit('user2', 'DEFAULT');
			
			const stats = rateLimiter.getStats();
			
			expect(stats.totalEntries).toBe(3);
			expect(stats.activeUsers).toBe(2);
			expect(stats.operationBreakdown.DEFAULT).toBe(2);
			expect(stats.operationBreakdown.GROUP_CREATION).toBe(1);
		});
	});

	describe('configuration validation', () => {
		it('should have valid default configurations', () => {
			Object.entries(RATE_LIMIT_CONFIGS).forEach(([key, config]) => {
				expect(config.windowMs).toBeGreaterThan(0);
				expect(config.maxRequests).toBeGreaterThan(0);
				expect(typeof config.windowMs).toBe('number');
				expect(typeof config.maxRequests).toBe('number');
			});
		});
	});
});