package com.insighthub.parameter;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a single List-of-Values option with a value (id) and display label.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LovOption {

    private String value;
    private String label;
}
