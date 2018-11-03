import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

import java.io.Closeable;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryPoolMXBean;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryType;
import java.lang.management.MemoryUsage;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Aspect
public class StatisticsAspect {
    /**
     * Get the memory usage of the previous run.
     * @return the memory usage.
     */
    private static long getMemoryUsage() {
        long memoryUsage = 0;
        List<MemoryPoolMXBean> memoryPools = ManagementFactory.getMemoryPoolMXBeans();
        for (MemoryPoolMXBean memoryPool : memoryPools) {
            if (memoryPool.getType() == MemoryType.HEAP) {
                memoryUsage += memoryPool.getPeakUsage().getUsed();
            }
        }
        return memoryUsage;
    }

    @Around("execution(public !static * <class-name>.*(..)) && target(Statistics) && this(o)")
    public Object codeStatistics(final ProceedingJoinPoint point, final Object o) throws Throwable {
        Statistics statistics = (Statistics) o;
        long memory = statistics.getMemory();
        // Run the method
        long startTime = System.currentTimeMillis();
        Object result = point.proceed();
        long endTime = System.currentTimeMillis();
        // Get statistics set
        statistics.setExecuteTime(endTime - startTime);
        statistics.setMemory(Math.max(memory, getMemoryUsage()));
        return result;
    }
}
