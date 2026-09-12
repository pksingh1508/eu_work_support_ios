import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";

type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const [first = "", second = ""] = parts;
  const fallback = first.charAt(1);

  return `${first.charAt(0)}${second.charAt(0) || fallback}`.toUpperCase();
}

/**
 * Profile avatar: remote image when available, otherwise initials on the
 * brand gradient.
 */
export function Avatar({ name, imageUrl, size = 72, style }: AvatarProps) {
  const { colors } = useTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const initials = getInitials(name);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[shape, style]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
        accessibilityLabel={`${name} profile photo`}
      />
    );
  }

  return (
    <LinearGradient
      colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[shape, styles.center, style]}
    >
      {initials ? (
        <AppText
          variant="title2"
          color="onPrimary"
          style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}
        >
          {initials}
        </AppText>
      ) : (
        <View style={styles.center}>
          <Icon name="person" size={size * 0.5} color={colors.onPrimary} />
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
