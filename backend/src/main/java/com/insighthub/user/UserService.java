package com.insighthub.user;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.role.RoleEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
            .map(this::toDto)
            .toList();
    }

    public UserDto getUserById(Long id) {
        return userRepository.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    public UserDto getUserByUsername(String username) {
        return userRepository.findByUsername(username)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }

    @Transactional
    public UserDto createUser(CreateUserRequest request, String createdBy) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + request.getUsername());
        }

        UserEntity user = UserEntity.builder()
            .username(request.getUsername())
            .password(passwordEncoder.encode(request.getPassword()))
            .fullName(request.getFullName())
            .email(request.getEmail())
            .description(request.getDescription())
            .accessLevel(request.getAccessLevel())
            .active(true)
            .publicUser(false)
            .createdBy(createdBy)
            .build();

        return toDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateUser(Long id, UpdateUserRequest request, String updatedBy) {
        UserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getEmail() != null) user.setEmail(request.getEmail());
        if (request.getDescription() != null) user.setDescription(request.getDescription());
        if (request.getAccessLevel() != null) user.setAccessLevel(request.getAccessLevel());
        if (request.getActive() != null) user.setActive(request.getActive());
        user.setUpdatedBy(updatedBy);

        return toDto(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", "id", id);
        }
        userRepository.deleteById(id);
    }

    private UserDto toDto(UserEntity user) {
        Set<String> roleNames = user.getRoles().stream()
            .map(RoleEntity::getName)
            .collect(Collectors.toSet());

        Set<String> permissionNames = user.getRoles().stream()
            .flatMap(role -> role.getPermissions().stream())
            .map(perm -> perm.getName())
            .collect(Collectors.toSet());

        return UserDto.builder()
            .id(user.getId())
            .username(user.getUsername())
            .fullName(user.getFullName())
            .email(user.getEmail())
            .description(user.getDescription())
            .accessLevel(user.getAccessLevel())
            .active(user.isActive())
            .publicUser(user.isPublicUser())
            .roles(roleNames)
            .permissions(permissionNames)
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .build();
    }
}
