// src/shared/components/SuggestionInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  TextInputProps,
  BlurEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface SuggestionInputProps extends TextInputProps {
  suggestions: string[];
  onSelect: (value: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  showAllOnFocus?: boolean;
  maxSuggestions?: number;
  compact?: boolean;
}

export const SuggestionInput: React.FC<SuggestionInputProps> = ({
  suggestions,
  onSelect,
  icon,
  error,
  showAllOnFocus = false,
  maxSuggestions = 5,
  compact = false,
  value,
  onChangeText,
  placeholder,
  onBlur,
  ...props
}) => {
  const { colors } = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const isSelecting = useRef(false);

  useEffect(() => {
    if (value && value.trim() && suggestions.length > 0) {
      const filtered = suggestions.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      const exactMatch = filtered.some(s => s.toLowerCase() === value.toLowerCase());
      setFilteredSuggestions(filtered.slice(0, maxSuggestions));
      setShowSuggestions(isFocused && filtered.length > 0 && !exactMatch);
    } else if (showAllOnFocus && suggestions.length > 0) {
      setFilteredSuggestions(suggestions.slice(0, maxSuggestions));
      setShowSuggestions(isFocused);
    } else {
      setShowSuggestions(false);
    }
  }, [value, suggestions, showAllOnFocus, isFocused, maxSuggestions]);

  const handleSelect = (item: string) => {
    isSelecting.current = true;
    onSelect(item);
    setIsFocused(false);
    setShowSuggestions(false);
    if (onChangeText) onChangeText(item);
    setTimeout(() => {
      isSelecting.current = false;
    }, 200);
  };

  const handleBlur = (e: BlurEvent) => {
    setTimeout(() => {
      if (!isSelecting.current) {
        setIsFocused(false);
        setShowSuggestions(false);
      }
      if (onBlur) {
        onBlur(e);
      }
    }, 150);
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View
        style={[
          styles.inputContainer,
          compact && styles.inputContainerCompact,
          {
            borderColor: error ? colors.status.error : colors.common.border,
            backgroundColor: colors.common.card,
          },
        ]}
      >
        {icon && (
          <Ionicons name={icon} size={compact ? 17 : 20} color={colors.text.tertiary} style={styles.icon} />
        )}
        <TextInput
          style={[styles.input, compact && styles.inputCompact, { color: colors.text.primary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          value={value}
          onChangeText={(text) => {
            if (onChangeText) onChangeText(text);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (showAllOnFocus && (!value || !value.trim()) && suggestions.length > 0) {
              setFilteredSuggestions(suggestions.slice(0, maxSuggestions));
              setShowSuggestions(true);
              return;
            }
            if (value && value.trim() && filteredSuggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={handleBlur}
          {...props}
        />
      </View>
      {error && <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.common.card, borderColor: colors.common.border }]}> 
          {filteredSuggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item}-${index}`}
              style={[styles.suggestionItem, { borderBottomColor: colors.common.border }]}
              onPressIn={() => { isSelecting.current = true; }}
              onPress={() => handleSelect(item)}
            >
              <Text style={[styles.suggestionText, { color: colors.text.primary }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    zIndex: 2,
  },
  containerCompact: {
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  inputContainerCompact: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    minHeight: 20,
  },
  inputCompact: {
    fontSize: 14,
    minHeight: 18,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  suggestionItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 15,
  },
});

