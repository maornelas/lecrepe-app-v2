import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface OTPInputProps {
  length?: number;
  onComplete: (value: string) => void;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 4,
  onComplete,
  onChange,
  autoFocus = false,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length > 1) {
      // Handle paste
      const pastedText = numericText.slice(0, length);
      const newOtp = [...otp];
      pastedText.split('').forEach((char, i) => {
        if (index + i < length) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      
      // Focus last filled input
      const lastIndex = Math.min(index + pastedText.length - 1, length - 1);
      inputRefs.current[lastIndex]?.focus();
      
      const otpValue = newOtp.join('');
      onChange?.(otpValue);
      if (otpValue.length === length) {
        onComplete(otpValue);
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);

    const otpValue = newOtp.join('');
    onChange?.(otpValue);

    // Move to next input if text entered
    if (numericText && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete if all fields are filled
    if (otpValue.length === length && otpValue.split('').every(char => char !== '')) {
      onComplete(otpValue);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  return (
    <View style={styles.container}>
      {otp.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={[styles.input, digit ? styles.inputFilled : null]}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="number-pad"
          maxLength={1}
          autoFocus={autoFocus && index === 0}
          selectTextOnFocus
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  input: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#fff',
  },
  inputFilled: {
    borderColor: '#E8A334',
    backgroundColor: '#fff8f0',
  },
});

export default OTPInput;





