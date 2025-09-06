import { performance, PerformanceObserver } from 'perf_hooks';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { config } from '../config';

/**
 * Performance monitoring and resource management service
 */
/**
 * Performance metric structure
 */
interface PerformanceMetric {
	timestamp: number;
	duration: number;
	success: boolean;
	error?: string;
	metadata?: Record<string, unknown>;
}

export class PerformanceMonitor {
	private static instance: PerformanceMonitor;
	private performanceObserver: PerformanceObserver | null = null;
	private metrics: Map<string, PerformanceMetric[]> = new Map();
	private memoryCheckInterval: NodeJS.Timeout | null = null;
	private healthCheckInterval: NodeJS.Timeout | null = null;
	private readonly maxMetricsHistory = 100;

	private constructor() {
		this.setupPerformanceObserver();
		this.startMemoryMonitoring();
		this.startHealthChecks();
	}

	static getInstance(): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor();
		}
		return PerformanceMonitor.instance;
	}

	/**
	 * Sets up performance observer for automatic timing
	 */
	private setupPerformanceObserver(): void {
		try {
			this.performanceObserver = new PerformanceObserver((list) => {
				const entries = list.getEntries();
				entries.forEach((entry) => {
					if (entry.name.startsWith('discord-bot:')) {
						this.recordMetric(entry.name.replace('discord-bot:', ''), {
							timestamp: Date.now(),
							duration: entry.duration,
							success: true,
						});
					}
				});
			});

			this.performanceObserver.observe({ entryTypes: ['measure'] });
		} catch (error) {
			logger(LogLevel.WARN, `Failed to setup performance observer: ${config.sanitizeForLogging(error)}`);
		}
	}

	/**
	 * Starts a performance measurement
	 */
	startTiming(operationName: string, metadata?: Record<string, unknown>): string {
		const markName = `discord-bot:${operationName}:start:${Date.now()}:${Math.random()}`;
		performance.mark(markName);
		
		if (metadata) {
			this.recordMetadata(markName, metadata);
		}
		
		return markName;
	}

	/**
	 * Ends a performance measurement
	 */
	endTiming(markName: string, success = true, error?: string): void {
		try {
			const endMarkName = `${markName}:end`;
			performance.mark(endMarkName);
			
			const measureName = `discord-bot:${markName.split(':')[1]}`;
			performance.measure(measureName, markName, endMarkName);
			
			// Clean up marks
			performance.clearMarks(markName);
			performance.clearMarks(endMarkName);
			
			// Record additional metadata if operation failed
			if (!success && error) {
				const operationName = markName.split(':')[1];
				this.recordMetric(operationName || 'unknown', {
					timestamp: Date.now(),
					duration: 0,
					success: false,
					error,
				});
			}
		} catch (measureError) {
			logger(LogLevel.WARN, `Failed to end timing for ${markName}: ${config.sanitizeForLogging(measureError)}`);
		}
	}

	/**
	 * Decorator for automatic method timing
	 */
	static time(operationName?: string) {
		return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
			const originalMethod = descriptor.value;
			const operation = operationName || `${target.constructor.name}.${propertyKey}`;
			
			descriptor.value = async function (this: any, ...args: any[]) {
				const monitor = PerformanceMonitor.getInstance();
				const markName = monitor.startTiming(operation);
				
				try {
					const result = await originalMethod.apply(this, args);
					monitor.endTiming(markName, true);
					return result;
				} catch (error) {
					monitor.endTiming(markName, false, String(error));
					throw error;
				}
			};
			
			return descriptor;
		};
	}

	/**
	 * Records a performance metric manually
	 */
	recordMetric(operationName: string, metric: PerformanceMetric): void {
		if (!this.metrics.has(operationName)) {
			this.metrics.set(operationName, []);
		}
		
		const operationMetrics = this.metrics.get(operationName)!;
		operationMetrics.push(metric);
		
		// Keep only recent metrics to prevent memory leaks
		if (operationMetrics.length > this.maxMetricsHistory) {
			operationMetrics.shift();
		}
		
		// Log slow operations
		if (metric.duration > 5000) { // 5 seconds threshold
			logger(LogLevel.WARN, `Slow operation detected: ${operationName}`, {
				duration: metric.duration,
				success: metric.success,
				error: metric.error,
			});
		}
	}

	/**
	 * Records metadata for an operation
	 */
	private recordMetadata(markName: string, metadata: Record<string, unknown>): void {
		// Store metadata temporarily - in a real implementation, you might want to use WeakMap
		(performance as any)._metadata = (performance as any)._metadata || new Map();
		(performance as any)._metadata.set(markName, metadata);
	}

	/**
	 * Gets performance statistics for an operation
	 */
	getOperationStats(operationName: string): {
		totalCalls: number;
		averageDuration: number;
		successRate: number;
		p95Duration: number;
		p99Duration: number;
		recentErrors: string[];
	} | null {
		const metrics = this.metrics.get(operationName);
		if (!metrics || metrics.length === 0) {
			return null;
		}

		const successfulCalls = metrics.filter(m => m.success);
		const durations = successfulCalls.map(m => m.duration).sort((a, b) => a - b);
		const recentErrors = metrics
			.filter(m => !m.success && m.error)
			.slice(-5)
			.map(m => m.error!);

		return {
			totalCalls: metrics.length,
			averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
			successRate: (successfulCalls.length / metrics.length) * 100,
			p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
			p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
			recentErrors,
		};
	}

	/**
	 * Gets all performance statistics
	 */
	getAllStats(): Record<string, ReturnType<typeof this.getOperationStats>> {
		const stats: Record<string, ReturnType<typeof this.getOperationStats>> = {};
		
		for (const operationName of this.metrics.keys()) {
			stats[operationName] = this.getOperationStats(operationName);
		}
		
		return stats;
	}

	/**
	 * Starts memory monitoring
	 */
	private startMemoryMonitoring(): void {
		this.memoryCheckInterval = setInterval(() => {
			const memoryUsage = process.memoryUsage();
			const memoryMB = {
				rss: Math.round(memoryUsage.rss / 1024 / 1024),
				heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
				heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
				external: Math.round(memoryUsage.external / 1024 / 1024),
			};

			// Log memory usage every 10 minutes
			const now = Date.now();
			if (now % (10 * 60 * 1000) < 60 * 1000) { // Within 1 minute of 10-minute mark
				logger(LogLevel.DEBUG, 'Memory usage report', memoryMB);
			}

			// Warn about high memory usage
			if (memoryMB.heapUsed > 500) { // 500MB threshold
				logger(LogLevel.WARN, 'High memory usage detected', memoryMB);
			}

			// Force garbage collection if memory is very high (Node.js with --expose-gc flag)
			if (memoryMB.heapUsed > 800 && global.gc) {
				logger(LogLevel.WARN, 'Forcing garbage collection due to high memory usage');
				global.gc();
			}
		}, 60 * 1000); // Check every minute
	}

	/**
	 * Starts health checks
	 */
	private startHealthChecks(): void {
		this.healthCheckInterval = setInterval(async () => {
			try {
				await this.performHealthCheck();
			} catch (error) {
				logger(LogLevel.ERROR, `Health check failed: ${config.sanitizeForLogging(error)}`);
			}
		}, 5 * 60 * 1000); // Every 5 minutes
	}

	/**
	 * Performs a comprehensive health check
	 */
	async performHealthCheck(): Promise<{
		status: 'healthy' | 'degraded' | 'unhealthy';
		checks: Record<string, { status: 'pass' | 'fail'; message?: string; latency?: number }>;
	}> {
		const checks: Record<string, { status: 'pass' | 'fail'; message?: string; latency?: number }> = {};
		
		// Memory check
		const memoryUsage = process.memoryUsage();
		const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
		checks.memory = {
			status: memoryMB < 800 ? 'pass' : 'fail',
			message: `${Math.round(memoryMB)}MB used`,
		};

		// Event loop lag check
		const start = performance.now();
		await new Promise(resolve => setImmediate(resolve));
		const eventLoopLag = performance.now() - start;
		checks.eventLoop = {
			status: eventLoopLag < 100 ? 'pass' : 'fail',
			message: `${Math.round(eventLoopLag)}ms lag`,
			latency: eventLoopLag,
		};

		// Database connectivity (if mongoose is available)
		try {
			const mongoose = await import('mongoose');
			if (mongoose.connection.readyState === 1) {
				const dbStart = performance.now();
				await mongoose.connection.db.admin().ping();
				const dbLatency = performance.now() - dbStart;
				checks.database = {
					status: dbLatency < 1000 ? 'pass' : 'fail',
					message: `Connected, ${Math.round(dbLatency)}ms latency`,
					latency: dbLatency,
				};
			} else {
				checks.database = {
					status: 'fail',
					message: 'Not connected',
				};
			}
		} catch (error) {
			checks.database = {
				status: 'fail',
				message: `Error: ${String(error)}`,
			};
		}

		// Performance metrics check
		const allStats = this.getAllStats();
		const criticalOperations = ['groupCreation', 'eventScheduling', 'playerAnalytics'];
		let performanceIssues = 0;

		criticalOperations.forEach(operation => {
			const stats = allStats[operation];
			if (stats && (stats.averageDuration > 2000 || stats.successRate < 95)) {
				performanceIssues++;
			}
		});

		checks.performance = {
			status: performanceIssues === 0 ? 'pass' : 'fail',
			message: performanceIssues > 0 ? `${performanceIssues} critical operations underperforming` : 'All operations performing well',
		};

		// Overall health status
		const failedChecks = Object.values(checks).filter(c => c.status === 'fail').length;
		let status: 'healthy' | 'degraded' | 'unhealthy';
		
		if (failedChecks === 0) {
			status = 'healthy';
		} else if (failedChecks <= 1) {
			status = 'degraded';
		} else {
			status = 'unhealthy';
		}

		if (status !== 'healthy') {
			logger(LogLevel.WARN, `Health check status: ${status}`, { checks });
		}

		return { status, checks };
	}

	/**
	 * Gets current system metrics
	 */
	getSystemMetrics(): {
		uptime: number;
		memory: NodeJS.MemoryUsage;
		cpu: NodeJS.CpuUsage;
		platform: string;
		nodeVersion: string;
	} {
		return {
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			cpu: process.cpuUsage(),
			platform: process.platform,
			nodeVersion: process.version,
		};
	}

	/**
	 * Clears old metrics to free memory
	 */
	clearOldMetrics(maxAgeMs = 24 * 60 * 60 * 1000): void { // 24 hours default
		const cutoff = Date.now() - maxAgeMs;
		let clearedCount = 0;

		for (const [operationName, metrics] of this.metrics.entries()) {
			const filteredMetrics = metrics.filter(m => m.timestamp > cutoff);
			if (filteredMetrics.length !== metrics.length) {
				clearedCount += metrics.length - filteredMetrics.length;
				this.metrics.set(operationName, filteredMetrics);
			}
		}

		if (clearedCount > 0) {
			logger(LogLevel.DEBUG, `Cleared ${clearedCount} old performance metrics`);
		}
	}

	/**
	 * Exports metrics for external monitoring systems
	 */
	exportMetrics(): {
		timestamp: number;
		operations: Record<string, ReturnType<typeof this.getOperationStats>>;
		system: ReturnType<typeof this.getSystemMetrics>;
	} {
		return {
			timestamp: Date.now(),
			operations: this.getAllStats(),
			system: this.getSystemMetrics(),
		};
	}

	/**
	 * Shuts down the performance monitor
	 */
	shutdown(): void {
		if (this.performanceObserver) {
			this.performanceObserver.disconnect();
			this.performanceObserver = null;
		}

		if (this.memoryCheckInterval) {
			clearInterval(this.memoryCheckInterval);
			this.memoryCheckInterval = null;
		}

		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
		}

		this.metrics.clear();
		logger(LogLevel.INFO, 'Performance monitor shutdown complete');
	}
}

// Export singleton instance and decorator
export const performanceMonitor = PerformanceMonitor.getInstance();
export const Time = PerformanceMonitor.time;