package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserResponseDTO getMe(@RequestParam("userId") Long userId) {
        User user = userService.getUserById(userId);
        return toUserResponse(user);
    }

    @GetMapping("/{id}")
    public UserResponseDTO getById(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return toUserResponse(user);
    }

    @GetMapping
    public List<UserResponseDTO> getAll() {
        return userService.getAllUsers().stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    private UserResponseDTO toUserResponse(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
