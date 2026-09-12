import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import type { IconName } from "@/components/ui/icon-names";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Surface } from "@/components/ui/surface";
import { Radii, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { openMailTo } from "@/lib/url";

const SUPPORT_EMAIL = "support@euworksupport.eu";

const sourceParagraphs = [
  "Information available within the application is researched from publicly available sources, including official government websites, European Union portals, embassy and consulate websites, official immigration authority websites, and official university or college websites.",
  "Our team reviews, simplifies, and organizes the information to make it easier for users to understand. We do not copy or reproduce complete third-party articles.",
];

const disclaimerParagraphs = [
  "Immigration rules, visa requirements, university information, document requirements, fees, and application procedures may change without notice. Users should always confirm the latest information directly with the relevant official authority before making an application or financial decision.",
  "EU Work Support does not provide legal, immigration, financial, recruitment, or professional advice. Information provided through the app should not be considered a substitute for advice from a qualified professional or authorized government authority.",
];

const reviewParagraphs = [
  "Our content is periodically reviewed against the official sources linked within each article. The “Last reviewed” date indicates when the information was most recently checked by our content team.",
];

export default function SourcesAndDisclaimerScreen() {
  const { colors } = useTheme();

  return (
    <Screen scroll header={<ScreenHeader padded title="Sources and disclaimer" />}>
      <Entrance index={0}>
        <Surface tone="primary">
          <IconBadge icon="shield" tone="primary" size={52} />
          <AppText variant="title2" style={styles.heroTitle}>
            Independent information, clearly sourced
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.heroBody}>
            EU Work Support is an independent educational and informational
            application. We are not affiliated with, endorsed by, or officially
            connected to any government, embassy, consulate, immigration
            authority, visa office, university, college, or employment
            authority.
          </AppText>
        </Surface>
      </Entrance>

      <ContentCard index={1} icon="sources" title="Our sources" paragraphs={sourceParagraphs} />
      <ContentCard index={2} icon="alert" title="Disclaimer" paragraphs={disclaimerParagraphs} />
      <ContentCard
        index={3}
        icon="checkCircle"
        title="Content review process"
        paragraphs={reviewParagraphs}
      />

      <Entrance index={4} style={styles.section}>
        <Surface>
          <CardHeading icon="reportProblem" title="Reporting outdated information" />
          <AppText variant="body" color="textSecondary" style={styles.paragraph}>
            Report inaccurate or outdated information through Support in the app
            or by emailing us directly.
          </AppText>
          <PressableScale
            onPress={() => openMailTo(SUPPORT_EMAIL, "Report outdated information")}
            scaleTo={0.97}
            haptic="light"
            accessibilityRole="link"
            accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
            style={[styles.emailChip, { backgroundColor: colors.primarySoft }]}
          >
            <Icon name="mail" size={16} color={colors.primary} />
            <AppText variant="label" color="primary">
              {SUPPORT_EMAIL}
            </AppText>
          </PressableScale>
        </Surface>
      </Entrance>
    </Screen>
  );
}

function ContentCard({
  index,
  icon,
  title,
  paragraphs,
}: {
  index: number;
  icon: IconName;
  title: string;
  paragraphs: string[];
}) {
  return (
    <Entrance index={index} style={styles.section}>
      <Surface>
        <CardHeading icon={icon} title={title} />
        <View style={styles.paragraphs}>
          {paragraphs.map((paragraph) => (
            <AppText key={paragraph} variant="body" color="textSecondary">
              {paragraph}
            </AppText>
          ))}
        </View>
      </Surface>
    </Entrance>
  );
}

function CardHeading({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.heading}>
      <IconBadge icon={icon} size={40} />
      <AppText variant="title3" style={styles.headingText}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    marginTop: Spacing.lg,
  },
  heroBody: {
    marginTop: Spacing.md,
  },
  section: {
    marginTop: Spacing.lg,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  headingText: {
    flex: 1,
    minWidth: 0,
  },
  paragraphs: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  paragraph: {
    marginTop: Spacing.lg,
  },
  emailChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
  },
});
