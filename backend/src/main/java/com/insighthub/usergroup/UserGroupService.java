package com.insighthub.usergroup;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.role.RoleEntity;
import com.insighthub.role.RoleRepository;
import com.insighthub.user.UserEntity;
import com.insighthub.user.UserRepository;
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
public class UserGroupService {

    private final UserGroupRepository userGroupRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public List<UserGroupDto> getAllUserGroups() {
        return userGroupRepository.findAll().stream()
            .map(this::toDto)
            .toList();
    }

    public UserGroupDto getUserGroupById(Long id) {
        return userGroupRepository.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("UserGroup", "id", id));
    }

    @Transactional
    public UserGroupDto createUserGroup(UserGroupRequest request) {
        if (userGroupRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("User group already exists: " + request.getName());
        }

        UserGroupEntity group = UserGroupEntity.builder()
            .name(request.getName())
            .description(request.getDescription())
            .build();

        return toDto(userGroupRepository.save(group));
    }

    @Transactional
    public UserGroupDto updateUserGroup(Long id, UserGroupRequest request) {
        UserGroupEntity group = userGroupRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("UserGroup", "id", id));

        group.setName(request.getName());
        group.setDescription(request.getDescription());

        return toDto(userGroupRepository.save(group));
    }

    @Transactional
    public void deleteUserGroup(Long id) {
        if (!userGroupRepository.existsById(id)) {
            throw new ResourceNotFoundException("UserGroup", "id", id);
        }
        userGroupRepository.deleteById(id);
    }

    @Transactional
    public UserGroupDto addMembers(Long groupId, Set<Long> userIds) {
        UserGroupEntity group = userGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("UserGroup", "id", groupId));

        Set<UserEntity> users = new HashSet<>(userRepository.findAllById(userIds));
        group.getMembers().addAll(users);

        return toDto(userGroupRepository.save(group));
    }

    @Transactional
    public UserGroupDto removeMembers(Long groupId, Set<Long> userIds) {
        UserGroupEntity group = userGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("UserGroup", "id", groupId));

        group.getMembers().removeIf(u -> userIds.contains(u.getId()));

        return toDto(userGroupRepository.save(group));
    }

    @Transactional
    public UserGroupDto assignRoles(Long groupId, Set<Long> roleIds) {
        UserGroupEntity group = userGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("UserGroup", "id", groupId));

        Set<RoleEntity> roles = new HashSet<>(roleRepository.findAllById(roleIds));
        group.setRoles(roles);

        return toDto(userGroupRepository.save(group));
    }

    private UserGroupDto toDto(UserGroupEntity group) {
        Set<String> roleNames = group.getRoles().stream()
            .map(RoleEntity::getName)
            .collect(Collectors.toSet());

        return UserGroupDto.builder()
            .id(group.getId())
            .name(group.getName())
            .description(group.getDescription())
            .memberCount(group.getMembers().size())
            .roleNames(roleNames)
            .createdAt(group.getCreatedAt())
            .updatedAt(group.getUpdatedAt())
            .build();
    }
}
