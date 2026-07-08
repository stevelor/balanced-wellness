package com.balancedwellness.backend;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clients")
@CrossOrigin(origins = "http://localhost:5176") // Keep your frontend port here!
public class ClientController {

    @Autowired
    private ClientRepository clientRepository;

    // This endpoint grabs EVERY client from the Postgres database
    @GetMapping
    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }

    // This endpoint lets us save a NEW client to the database
    @PostMapping
    public Client createClient(@RequestBody Client client) {
        return clientRepository.save(client);
    }
}