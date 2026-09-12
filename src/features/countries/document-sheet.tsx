import { Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ContentSections } from "@/components/content/content-sections";
import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { Entrance } from "@/components/ui/entrance";
import { IconButton } from "@/components/ui/icon-button";
import { Surface } from "@/components/ui/surface";
import { Layout, Radii, Spacing } from "@/constants/theme";
import type { CountryDocument } from "@/features/countries/country-service";
import { useTheme } from "@/hooks/use-theme";

type DocumentSheetProps = {
  document: CountryDocument | null;
  onClose: () => void;
};

/**
 * Native page sheet that shows a guide without leaving the country screen.
 */
export function DocumentSheet({ document, onClose }: DocumentSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={Boolean(document)}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={Platform.OS === "ios" ? ["bottom"] : ["top", "bottom"]}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {document ? (
          <>
            <View style={styles.header}>
              <View style={[styles.grabber, { backgroundColor: colors.outlineStrong }]} />
              <View style={styles.headerRow}>
                <View style={styles.headerTexts}>
                  <Chip label={document.categoryName} tone="primary" uppercase />
                  <AppText variant="title2" style={styles.title}>
                    {document.title}
                  </AppText>
                </View>
                <IconButton
                  icon="close"
                  variant="tonal"
                  size={40}
                  iconSize={16}
                  accessibilityLabel="Close guide"
                  onPress={onClose}
                />
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {document.intro ? (
                <Entrance from="none">
                  <Surface level={1} style={styles.intro}>
                    <AppText variant="body" color="textSecondary">
                      {document.intro}
                    </AppText>
                  </Surface>
                </Entrance>
              ) : null}
              <ContentSections sections={document.contentJson.sections ?? []} />
            </ScrollView>
          </>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: Radii.pill,
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  headerTexts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    marginTop: Spacing.sm,
  },
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Layout.bottomPadding + Spacing.xl,
    gap: Spacing.md,
  },
  intro: {
    marginBottom: Spacing.xs,
  },
});
