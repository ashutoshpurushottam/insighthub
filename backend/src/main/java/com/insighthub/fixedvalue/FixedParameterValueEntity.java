package com.insighthub.fixedvalue;

import com.insighthub.parameter.ParameterEntity;
import com.insighthub.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "fixed_parameter_values",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_fpv_user_param",
        columnNames = {"user_id", "parameter_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FixedParameterValueEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parameter_id", nullable = false)
    private ParameterEntity parameter;

    @Column(name = "fixed_value", nullable = false, length = 500)
    private String fixedValue;
}
