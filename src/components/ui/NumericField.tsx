import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { numericInput, syncNumericInput } from '../../utils/numericInput';
import { Field } from './field';

export function NumericField({ label, value, onChangeValue, integer = false, optional = false }: {
  label: string;
  value: number;
  onChangeValue: (value: number) => void;
  integer?: boolean;
  optional?: boolean;
}) {
  const [text, setText] = useState(() => optional && value === 0 ? '' : String(value));

  useEffect(() => {
    setText((current) => syncNumericInput(current, value));
  }, [value]);

  return (
    <Field
      label={label}
      value={text}
      onChangeText={(next) => {
        const input = numericInput(next, integer);
        if (!input) return;
        setText(input.text);
        onChangeValue(input.value);
      }}
      // Some iOS decimal pads expose only a comma for the current locale.
      keyboardType={integer ? 'number-pad' : Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
    />
  );
}
