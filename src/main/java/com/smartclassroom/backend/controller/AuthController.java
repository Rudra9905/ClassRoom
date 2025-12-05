package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.dto.auth.*;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponseDTO register(@Valid @RequestBody RegisterRequestDTO request) {
        User user = userService.registerUser(request);
        return AuthResponseDTO.builder()
                .user(toUserResponse(user))
                .token(null)
                .build();
    }

    @PostMapping("/login")
    public AuthResponseDTO login(@Valid @RequestBody LoginRequestDTO request) {
        User user = userService.authenticateUser(request);
        return AuthResponseDTO.builder()
                .user(toUserResponse(user))
                .token(null)
                .build();
    }

    private UserResponseDTO toUserResponse(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .profileImageUrl(user.getProfileImageUrl())
                .role(user.getRole())
                .build();
    }
}
