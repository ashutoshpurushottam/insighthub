package com.insighthub.datasource;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "datasources")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DatasourceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 200)
    private String description;

    @Column(length = 20)
    private String datasourceType;

    @Column(length = 100)
    private String databaseType;

    @Column(length = 200)
    private String driver;

    @Column(length = 2000)
    private String url;

    @Column(length = 100)
    private String username;

    @Column(length = 200)
    private String password;

    @Column(nullable = false)
    private boolean active = true;

    @Column(length = 60)
    private String testSql;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(length = 50)
    private String createdBy;

    @Column(length = 50)
    private String updatedBy;
}
