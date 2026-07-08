package com.balancedwellness.backend;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity // This tells Spring Boot to turn this class into a Postgres table
public class Client {

    @Id // This makes 'id' the Primary Key
    @GeneratedValue(strategy = GenerationType.IDENTITY) // This auto-increments the ID number (1, 2, 3...)
    private Long id;
    
    private String firstName;
    private String lastName;
    private String email;

    // --- GETTERS AND SETTERS ---
    // (In a real app, you might use a library called Lombok to hide these, but we will write them out for now)
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}