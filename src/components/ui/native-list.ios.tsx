import {
  Button,
  Form,
  HStack,
  Host,
  Image,
  Section,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  scrollContentBackground,
  truncationMode,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { iconMap } from "@/components/ui/icon-names";
import type {
  NativeListIdentity,
  NativeListProps,
  NativeListRow,
} from "@/components/ui/native-list.types";
import { useTheme } from "@/hooks/use-theme";
import { haptic } from "@/lib/haptics";

/**
 * Inset-grouped SwiftUI Form, the list style of the iOS Settings app: system
 * row heights, separators, press highlight, Dynamic Type and VoiceOver come
 * from UIKit. The Form scrolls itself, so it runs under the transparent
 * navigation bar and tab bar like any native list.
 */
export function NativeList({ sections, identity, footnote }: NativeListProps) {
  const { scheme, colors } = useTheme();

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Host style={styles.flex} colorScheme={scheme}>
        <Form modifiers={[scrollContentBackground("hidden")]}>
          {identity ? (
            <Section>
              <IdentityRow identity={identity} />
            </Section>
          ) : null}

          {sections.map((section, index) => {
            const isLast = index === sections.length - 1;
            const footer = section.footer ?? (isLast ? footnote : undefined);

            return (
              <Section
                key={section.key}
                title={section.title}
                footer={footer ? <Text>{footer}</Text> : undefined}
              >
                {section.rows.map((row) => (
                  <NativeRow key={row.key} row={row} accent={colors.primary} />
                ))}
              </Section>
            );
          })}
        </Form>
      </Host>
    </View>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Avatar, name, detail and plan, drawn by SwiftUI like the Settings app's account row. */
function IdentityRow({ identity }: { identity: NativeListIdentity }) {
  const { colors } = useTheme();
  const onPress = identity.onPress;

  const content = (
    <HStack spacing={16}>
      <Text
        modifiers={[
          font({ size: 24, weight: "semibold" }),
          foregroundStyle(colors.onPrimary),
          frame({ width: 60, height: 60 }),
          background(colors.primary),
          clipShape("circle"),
        ]}
      >
        {initialsOf(identity.name)}
      </Text>
      <VStack alignment="leading" spacing={3}>
        <Text
          modifiers={[
            font({ size: 20, weight: "semibold" }),
            foregroundStyle(colors.text),
            lineLimit(1),
          ]}
        >
          {identity.name}
        </Text>
        {identity.detail ? (
          <Text
            modifiers={[
              foregroundStyle(colors.textSecondary),
              lineLimit(1),
              truncationMode("middle"),
            ]}
          >
            {identity.detail}
          </Text>
        ) : null}
        {identity.badge ? (
          <HStack spacing={4}>
            <Image
              systemName={iconMap[identity.badge.icon].sf}
              size={13}
              color={identity.badge.color}
            />
            <Text
              modifiers={[
                font({ size: 13, weight: "semibold" }),
                foregroundStyle(identity.badge.color),
              ]}
            >
              {identity.badge.label}
            </Text>
          </HStack>
        ) : null}
      </VStack>
      <Spacer />
      {onPress ? (
        <Image systemName="chevron.right" size={13} color={chevronColor(colors.text)} />
      ) : null}
    </HStack>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Button
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      modifiers={[
        accessibilityLabel([identity.name, identity.detail].filter(Boolean).join(", ")),
      ]}
    >
      {content}
    </Button>
  );
}

export function NativeRow({ row, accent }: { row: NativeListRow; accent?: string }) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  // Accessibility text sizes: stack the value under the title, as Settings
  // does, instead of squeezing both onto one line.
  const stacked = Boolean(row.value) && fontScale >= 1.4;
  const tint = row.destructive ? colors.error : (row.iconColor ?? accent ?? colors.primary);
  const showChevron = row.chevron ?? Boolean(row.onPress);
  const label = [row.title, row.value].filter(Boolean).join(", ");

  const titleText = (
    <Text
      modifiers={[
        // Explicit colours: inside a Button, hierarchical styles resolve to
        // the tint, which would turn every row blue.
        foregroundStyle(row.destructive ? colors.error : colors.text),
      ]}
    >
      {row.title}
    </Text>
  );

  const content = (
    <HStack spacing={14}>
      {row.icon ? (
        <Image
          systemName={iconMap[row.icon].sf}
          color={tint}
          size={18}
          modifiers={[frame({ width: 26 })]}
        />
      ) : null}
      {stacked ? (
        <VStack alignment="leading" spacing={2}>
          {titleText}
          <Text modifiers={[foregroundStyle(colors.textSecondary)]}>{row.value}</Text>
        </VStack>
      ) : (
        titleText
      )}
      <Spacer />
      {row.value && !stacked ? (
        <Text modifiers={[foregroundStyle(colors.textSecondary)]}>{row.value}</Text>
      ) : null}
      {showChevron ? (
        <Image
          systemName={row.external ? "arrow.up.right" : "chevron.right"}
          size={13}
          color={chevronColor(colors.text)}
        />
      ) : null}
    </HStack>
  );

  if (!row.onPress) {
    return content;
  }

  const onPress = row.onPress;

  return (
    <Button
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      modifiers={[accessibilityLabel(label)]}
    >
      {content}
    </Button>
  );
}

/** iOS uses tertiaryLabel (~30% ink) for disclosure chevrons. */
function chevronColor(ink: string) {
  return ink.startsWith("#") ? `${ink}55` : ink;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
