package com.sharebite.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ShareBiteApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShareBiteApplication.class, args);
    }

}
