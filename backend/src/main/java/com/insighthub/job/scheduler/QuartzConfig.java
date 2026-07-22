package com.insighthub.job.scheduler;

import org.quartz.spi.TriggerFiredBundle;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.boot.autoconfigure.quartz.SchedulerFactoryBeanCustomizer;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.quartz.SchedulerFactoryBean;
import org.springframework.scheduling.quartz.SpringBeanJobFactory;

/**
 * Quartz Scheduler configuration.
 * <p>
 * Relies on Spring Boot's Quartz auto-configuration (spring.quartz.* properties in
 * application.yml) for SchedulerFactoryBean creation and JDBC job store setup.
 * This class provides a customizer for dependency injection in Job classes.
 * </p>
 */
@Configuration
public class QuartzConfig {

    /**
     * Customizer that sets the autowiring job factory on Spring Boot's auto-configured
     * SchedulerFactoryBean. This enables @Autowired in Quartz Job instances.
     */
    @Bean
    public SchedulerFactoryBeanCustomizer schedulerFactoryBeanCustomizer(ApplicationContext applicationContext) {
        return (SchedulerFactoryBean schedulerFactoryBean) -> {
            AutowiringSpringBeanJobFactory jobFactory = new AutowiringSpringBeanJobFactory();
            jobFactory.setApplicationContext(applicationContext);
            schedulerFactoryBean.setJobFactory(jobFactory);
            schedulerFactoryBean.setSchedulerName("InsightHubScheduler");
            schedulerFactoryBean.setOverwriteExistingJobs(true);
            schedulerFactoryBean.setWaitForJobsToCompleteOnShutdown(true);
        };
    }

    /**
     * A SpringBeanJobFactory extension that autowires Quartz Job instances
     * using Spring's ApplicationContext, enabling @Autowired injection in Job classes.
     */
    private static class AutowiringSpringBeanJobFactory extends SpringBeanJobFactory {

        private AutowireCapableBeanFactory beanFactory;

        public void setApplicationContext(ApplicationContext applicationContext) {
            this.beanFactory = applicationContext.getAutowireCapableBeanFactory();
        }

        @Override
        protected Object createJobInstance(TriggerFiredBundle bundle) throws Exception {
            Object job = super.createJobInstance(bundle);
            beanFactory.autowireBean(job);
            return job;
        }
    }
}
