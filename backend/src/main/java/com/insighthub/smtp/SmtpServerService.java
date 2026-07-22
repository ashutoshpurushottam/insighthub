package com.insighthub.smtp;

import com.insighthub.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SmtpServerService {

    private final SmtpServerRepository smtpServerRepository;

    public List<SmtpServerEntity> getAllActive() {
        return smtpServerRepository.findByActiveTrue();
    }

    public SmtpServerEntity getById(Long id) {
        return smtpServerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SmtpServer", "id", id));
    }

    @Transactional
    public SmtpServerEntity create(SmtpServerEntity entity) {
        return smtpServerRepository.save(entity);
    }

    @Transactional
    public SmtpServerEntity update(Long id, SmtpServerEntity entity) {
        SmtpServerEntity existing = getById(id);
        existing.setName(entity.getName());
        existing.setDescription(entity.getDescription());
        existing.setActive(entity.isActive());
        existing.setServer(entity.getServer());
        existing.setPort(entity.getPort());
        existing.setUseStarttls(entity.isUseStarttls());
        existing.setUseAuth(entity.isUseAuth());
        existing.setUsername(entity.getUsername());
        existing.setPassword(entity.getPassword());
        existing.setFromAddress(entity.getFromAddress());
        return smtpServerRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        if (!smtpServerRepository.existsById(id)) {
            throw new ResourceNotFoundException("SmtpServer", "id", id);
        }
        smtpServerRepository.deleteById(id);
    }
}
