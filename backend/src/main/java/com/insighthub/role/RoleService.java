package com.insighthub.role;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.permission.PermissionEntity;
import com.insighthub.permission.PermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public List<RoleDto> getAllRoles() {
        return roleRepository.findAll().stream()
            .map(this::toDto)
            .toList();
    }

    public RoleDto getRoleById(Long id) {
        return roleRepository.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));
    }

    @Transactional
    public RoleDto createRole(CreateRoleRequest request) {
        if (roleRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Role already exists: " + request.getName());
        }

        RoleEntity role = RoleEntity.builder()
            .name(request.getName())
            .description(request.getDescription())
            .permissions(resolvePermissions(request.getPermissionIds()))
            .build();

        return toDto(roleRepository.save(role));
    }

    @Transactional
    public RoleDto updateRole(Long id, CreateRoleRequest request) {
        RoleEntity role = roleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));

        role.setName(request.getName());
        role.setDescription(request.getDescription());
        if (request.getPermissionIds() != null) {
            role.setPermissions(resolvePermissions(request.getPermissionIds()));
        }

        return toDto(roleRepository.save(role));
    }

    @Transactional
    public void deleteRole(Long id) {
        if (!roleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Role", "id", id);
        }
        roleRepository.deleteById(id);
    }

    private Set<PermissionEntity> resolvePermissions(Set<Long> permissionIds) {
        if (permissionIds == null || permissionIds.isEmpty()) {
            return new HashSet<>();
        }
        return new HashSet<>(permissionRepository.findAllById(permissionIds));
    }

    private RoleDto toDto(RoleEntity role) {
        Set<String> permissionNames = role.getPermissions().stream()
            .map(PermissionEntity::getName)
            .collect(Collectors.toSet());

        return RoleDto.builder()
            .id(role.getId())
            .name(role.getName())
            .description(role.getDescription())
            .permissions(permissionNames)
            .createdAt(role.getCreatedAt())
            .updatedAt(role.getUpdatedAt())
            .build();
    }
}
