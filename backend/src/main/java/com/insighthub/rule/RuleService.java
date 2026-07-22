package com.insighthub.rule;

import com.insighthub.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RuleService {

    private final RuleRepository ruleRepository;

    public List<RuleDto> getAllRules() {
        return ruleRepository.findAll().stream()
            .map(this::toDto)
            .toList();
    }

    public RuleDto getRuleById(Long id) {
        return ruleRepository.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", id));
    }

    @Transactional
    public RuleDto createRule(CreateRuleRequest request) {
        RuleEntity entity = RuleEntity.builder()
            .name(request.getName())
            .description(request.getDescription())
            .build();

        return toDto(ruleRepository.save(entity));
    }

    @Transactional
    public RuleDto updateRule(Long id, CreateRuleRequest request) {
        RuleEntity entity = ruleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", id));

        entity.setName(request.getName());
        entity.setDescription(request.getDescription());

        return toDto(ruleRepository.save(entity));
    }

    @Transactional
    public void deleteRule(Long id) {
        if (!ruleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Rule", "id", id);
        }
        ruleRepository.deleteById(id);
    }

    private RuleDto toDto(RuleEntity entity) {
        return RuleDto.builder()
            .id(entity.getId())
            .name(entity.getName())
            .description(entity.getDescription())
            .createdAt(entity.getCreatedAt())
            .build();
    }
}
