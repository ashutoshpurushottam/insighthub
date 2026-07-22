package com.insighthub.execution;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Per-user concurrency limiter using ConcurrentHashMap with AtomicInteger counters.
 * Ensures no user exceeds the configured maximum concurrent report executions.
 *
 * <p>Thread-safe: all operations use atomic CAS loops or atomic decrements,
 * so concurrent access from multiple threads is handled correctly without locking.</p>
 */
@Component
public class ConcurrencyLimiter {

    private final ConcurrentHashMap<Long, AtomicInteger> activeCounters = new ConcurrentHashMap<>();

    /**
     * Attempts to acquire a concurrency slot for the given user.
     * Returns true if the user is under the specified limit, false otherwise.
     *
     * <p>Uses a CAS loop to atomically increment only if the current count is below the limit.</p>
     *
     * @param userId the ID of the user requesting execution
     * @param maxConcurrent the maximum number of concurrent executions allowed for the user
     * @return true if the slot was acquired, false if the user has reached the limit
     */
    public boolean tryAcquire(Long userId, int maxConcurrent) {
        AtomicInteger counter = activeCounters.computeIfAbsent(userId, k -> new AtomicInteger(0));

        while (true) {
            int current = counter.get();
            if (current >= maxConcurrent) {
                return false;
            }
            if (counter.compareAndSet(current, current + 1)) {
                return true;
            }
            // CAS failed — another thread modified the counter, retry
        }
    }

    /**
     * Releases a concurrency slot for the given user.
     * Decrements the counter but never below 0.
     *
     * <p>Must be called in a finally block after execution completes (success or exception)
     * to maintain Property 6: Concurrency Counter Balance.</p>
     *
     * @param userId the ID of the user whose slot is being released
     */
    public void release(Long userId) {
        AtomicInteger counter = activeCounters.get(userId);
        if (counter == null) {
            return;
        }

        while (true) {
            int current = counter.get();
            if (current <= 0) {
                return;
            }
            if (counter.compareAndSet(current, current - 1)) {
                return;
            }
            // CAS failed — another thread modified the counter, retry
        }
    }

    /**
     * Returns the current active execution count for the given user.
     * Useful for monitoring and testing.
     *
     * @param userId the ID of the user
     * @return the current number of active executions, or 0 if no entry exists
     */
    public int getActiveCount(Long userId) {
        AtomicInteger counter = activeCounters.get(userId);
        return counter == null ? 0 : counter.get();
    }
}
