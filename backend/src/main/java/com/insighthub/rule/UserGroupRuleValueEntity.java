package com.insighthub.rule;

import com.insighthub.usergroup.UserGroupEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_group_rule_values")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGroupRuleValueEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_group_id", nullable = false)
    private UserGroupEntity userGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private RuleEntity rule;

    @Column(name = "rule_value", nullable = false, length = 500)
    private String ruleValue;
}
