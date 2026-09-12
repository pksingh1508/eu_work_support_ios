import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
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
import type { IconName } from "@/components/ui/icon-names";
import { Motion, Radii, Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type TextFieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  icon?: IconName;
  error?: string | null;
  helper?: string;
  /** Adds a show / hide toggle for password fields. */
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

const FIELD_HEIGHT = 56;

/**
 * Form field with label, optional leading icon, focus ring and error state.
 */
export function TextField({
  label,
  icon,
  error,
  helper,
  secureToggle = false,
  secureTextEntry,
  containerStyle,
  editable = true,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const { colors } = useTheme();
  const focus = useSharedValue(0);
  const [isSecureVisible, setIsSecureVisible] = useState(false);
  const hasError = Boolean(error);

  const focusStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [hasError ? colors.error : colors.outline, hasError ? colors.error : colors.primary],
    ),
  }));

  const isSecure = secureToggle ? !isSecureVisible : secureTextEntry;

  return (
    <View style={containerStyle}>
      <AppText variant="label" color="textSecondary" style={styles.label}>
        {label}
      </AppText>

      <Animated.View
        style={[
          styles.field,
          {
            backgroundColor: hasError ? colors.errorSoft : colors.surfaceLow,
          },
          !editable ? styles.readOnly : null,
          focusStyle,
        ]}
      >
        {icon ? (
          <Icon
            name={icon}
            size={20}
            color={hasError ? colors.error : colors.textTertiary}
          />
        ) : null}

        <TextInput
          {...inputProps}
          editable={editable}
          secureTextEntry={isSecure}
          placeholderTextColor={colors.placeholder}
          onFocus={(event) => {
            focus.value = withTiming(1, {
              duration: Motion.duration.base,
              easing: Motion.easing.standard,
            });
            onFocus?.(event);
          }}
          onBlur={(event) => {
            focus.value = withTiming(0, {
              duration: Motion.duration.base,
              easing: Motion.easing.standard,
            });
            onBlur?.(event);
          }}
          style={[styles.input, Typography.callout, { color: colors.text }]}
        />

        {secureToggle ? (
          <IconButton
            icon={isSecureVisible ? "eyeOff" : "eye"}
            variant="plain"
            size={36}
            iconSize={20}
            iconColor={colors.textTertiary}
            accessibilityLabel={isSecureVisible ? "Hide password" : "Show password"}
            onPress={() => setIsSecureVisible((current) => !current)}
            haptic="selection"
          />
        ) : null}
      </Animated.View>

      {error ? (
        <AppText variant="caption" color="error" style={styles.helper}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="textTertiary" style={styles.helper}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  field: {
    height: FIELD_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  readOnly: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: FIELD_HEIGHT,
    paddingVertical: 0,
  },
  helper: {
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
  },
});
