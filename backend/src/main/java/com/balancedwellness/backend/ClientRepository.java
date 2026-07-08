package com.balancedwellness.backend;

import org.springframework.data.jpa.repository.JpaRepository;

// JpaRepository gives us free methods like .save(), .findAll(), and .deleteById()
public interface ClientRepository extends JpaRepository<Client, Long> {
    
    // We can even define custom searches just by naming the method correctly!
    Client findByEmail(String email);
    
}