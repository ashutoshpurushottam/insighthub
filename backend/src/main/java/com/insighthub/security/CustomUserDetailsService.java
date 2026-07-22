package com.insighthub.security;

import com.insighthub.permission.PermissionEntity;
import com.insighthub.role.RoleEntity;
import com.insighthub.user.UserEntity;
import com.insighthub.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        if (!user.isActive()) {
            throw new UsernameNotFoundException("User is inactive: " + username);
        }

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        authorities.add(new SimpleGrantedAuthority("ACCESS_LEVEL_" + user.getAccessLevel()));

        // Add ROLE_ADMIN for access levels >= 10
        if (user.getAccessLevel() >= 10) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }

        // Load permissions from user's assigned roles
        Set<RoleEntity> roles = user.getRoles();
        for (RoleEntity role : roles) {
            for (PermissionEntity perm : role.getPermissions()) {
                authorities.add(new SimpleGrantedAuthority(perm.getName()));
            }
        }

        return new User(user.getUsername(), user.getPassword(), authorities);
    }
}
