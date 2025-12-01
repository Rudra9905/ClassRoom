package com.smartclassroom.backend.service;

import com.smartclassroom.backend.dto.auth.LoginRequestDTO;
import com.smartclassroom.backend.dto.auth.RegisterRequestDTO;
import com.smartclassroom.backend.exception.BadRequestException;
import com.smartclassroom.backend.exception.DuplicateResourceException;
import com.smartclassroom.backend.exception.ResourceNotFoundException;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User registerUser(RegisterRequestDTO request) {
        userRepository.findByEmail(request.getEmail())
                .ifPresent(u -> { throw new DuplicateResourceException("Email already registered"); });

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(request.getPassword()) // TODO: hash password
                .role(request.getRole())
                .build();

        return userRepository.save(user);
    }

    public User authenticateUser(LoginRequestDTO request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!user.getPassword().equals(request.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }
        return user;
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + id));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}
