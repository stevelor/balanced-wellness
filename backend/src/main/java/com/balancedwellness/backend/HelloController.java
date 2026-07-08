package com.balancedwellness.backend;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "http://localhost:5176") // Allows your JS frontend to talk to this Java server
public class HelloController {

    @GetMapping("/api/test")
    public String sayHello() {
        return "{\"message\": \"Hello from the Java Backend!\"}";
    }
}