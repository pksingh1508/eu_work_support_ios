import { useState, type RefObject } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Motion, Radii, Shadows, Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type SearchFieldBaseProps = {
  placeholder?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

type SearchFieldButtonProps = SearchFieldBaseProps & {
  mode: "button";
  onPress: () => void;
};

type SearchFieldInputProps = SearchFieldBaseProps & {
  mode: "input";
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
  inputRef?: RefObject<TextInput | null>;
};

export type SearchFieldProps = SearchFieldButtonProps | SearchFieldInputProps;

const DEFAULT_PLACEHOLDER = "Search countries, visas and guides";
const FIELD_HEIGHT = 56;

/**
 * Pill search bar. In `button` mode it is a tappable shortcut (Home),
 * in `input` mode it is a live text field with a focus ring (Search).
 */
export function SearchField(props: SearchFieldProps) {
  const { colors } = useTheme();
  const {
    placeholder = DEFAULT_PLACEHOLDER,
    accessibilityLabel = "Search countries, visas and guides",
    style,
  } = props;

  const leadingIcon = (
    <View style={[styles.leadingIcon, { backgroundColor: colors.primarySoft }]}>
      <Icon name="search" size={18} color={colors.primary} weight="semibold" />
    </View>
  );

  if (props.mode === "button") {
    return (
      <PressableScale
        onPress={props.onPress}
        scaleTo={0.985}
        haptic="light"
        accessibilityRole="search"
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.container,
          Shadows.card,
          {
            backgroundColor: colors.surfaceLowest,
            borderColor: colors.outline,
          },
          style,
        ]}
      >
        {leadingIcon}
        <AppText
          variant="callout"
          color="placeholder"
          numberOfLines={1}
          style={styles.placeholder}
        >
          {placeholder}
        </AppText>
        <View style={[styles.trailingBadge, { backgroundColor: colors.primary }]}>
          <Icon name="arrowRight" size={16} color={colors.onPrimary} weight="bold" />
        </View>
      </PressableScale>
    );
  }

  return <SearchInput {...props} placeholder={placeholder} leadingIcon={leadingIcon} />;
}

function SearchInput({
  value,
  onChangeText,
  onSubmit,
  onClear,
  autoFocus,
  inputRef,
  placeholder,
  accessibilityLabel,
  style,
  leadingIcon,
}: SearchFieldInputProps & { leadingIcon: React.ReactNode }) {
  const { colors } = useTheme();
  const focus = useSharedValue(0);
  const [isFocused, setIsFocused] = useState(false);

  const focusStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [colors.outline, colors.primary],
    ),
  }));

  const setFocus = (nextFocused: boolean) => {
    setIsFocused(nextFocused);
    focus.value = withTiming(nextFocused ? 1 : 0, {
      duration: Motion.duration.base,
      easing: Motion.easing.standard,
    });
  };

  const handleClear = () => {
    onChangeText("");
    onClear?.();
    inputRef?.current?.focus();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isFocused ? Shadows.floating : Shadows.card,
        { backgroundColor: colors.surfaceLowest },
        focusStyle,
        style,
      ]}
    >
      {leadingIcon}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        autoFocus={autoFocus}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        accessibilityLabel={accessibilityLabel}
        style={[styles.input, Typography.callout, { color: colors.text }]}
      />
      {value.length > 0 ? (
        <IconButton
          icon="closeCircle"
          variant="plain"
          size={36}
          iconSize={20}
          iconColor={colors.textTertiary}
          accessibilityLabel="Clear search"
          onPress={handleClear}
          haptic="selection"
        />
      ) : (
        <Pressable
          onPress={onSubmit}
          accessibilityRole="button"
          accessibilityLabel="Submit search"
          hitSlop={Spacing.sm}
          style={[styles.trailingBadge, { backgroundColor: colors.primary }]}
        >
          <Icon name="arrowRight" size={16} color={colors.onPrimary} weight="bold" />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: FIELD_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.sm + Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  leadingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: FIELD_HEIGHT,
    paddingVertical: 0,
  },
  trailingBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
