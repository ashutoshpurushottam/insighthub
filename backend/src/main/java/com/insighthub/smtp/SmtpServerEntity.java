package com.insighthub.smtp;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "smtp_servers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmtpServerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(nullable = false, length = 200)
    private String server;

    @Column
    @Builder.Default
    private Integer port = 587;

    @Column(name = "use_starttls")
    @Builder.Default
    private boolean useStarttls = false;

    @Column(name = "use_auth")
    @Builder.Default
    private boolean useAuth = false;

    @Column(length = 200)
    private String username;

    @Column(length = 500)
    private String password;

    @Column(name = "from_address", length = 200)
    private String fromAddress;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
