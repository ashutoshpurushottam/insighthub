package com.insighthub.parameter;

import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;


import static org.junit.jupiter.api.Assertions.*;


public class ParameterValidatorTest {

  private final ParameterValidator validator = new ParameterValidator();

  private ParameterEntity numberParam(String name) {
    ParameterEntity param = new ParameterEntity();
    param.setName(name);
    param.setParamType("NUMBER");
    param.setRequired(false);
    return param;
  }

  @Test 
  void rejectsInfinity() {
    assertThrows(ParameterValidationException.class, () -> {
      validator.validate(
        List.of(numberParam("param1")),
        Map.of("param1", "Infinity")
      );
    });
  }

  @Test 
  void rejectsNaN() {
    assertThrows(ParameterValidationException.class, () -> {
      validator.validate(
        List.of(numberParam("score")),
        Map.of("score", "NaN")
      );
    });
  }

  @Test 
  void acceptsFiniteNumbers() {
    assertDoesNotThrow(() -> {
      validator.validate(
        List.of(numberParam("amount")),
        Map.of("amount", "123.45")
      );
    });
  }
 
}
