import { StyleSheet, View } from "react-native";

import { ContentSectionView } from "@/components/content/content-sections";
import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import { Layout, Spacing } from "@/constants/theme";
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
  return (
    <Screen nativeHeader scroll contentContainerStyle={styles.content}>
      <AppText variant="title1" accessibilityRole="header" selectable>
        Independent information, clearly sourced
      </AppText>
      <AppText variant="reading" selectable style={styles.lead}>
        EU Work Support is an independent educational and informational application. We
        are not affiliated with, endorsed by, or officially connected to any government,
        embassy, consulate, immigration authority, visa office, university, college, or
        employment authority.
      </AppText>

      <Section title="Our sources" paragraphs={sourceParagraphs} />
      <View style={styles.section}>
        <ContentSectionView
          section={{
            type: "warning",
            title: "Disclaimer",
            content: disclaimerParagraphs.join("\n\n"),
          }}
        />
      </View>
      <Section title="Content review process" paragraphs={reviewParagraphs} />
      <Section
        title="Reporting outdated information"
        paragraphs={[
          "Report inaccurate or outdated information through Support in the app or by emailing us directly.",
        ]}
      />
      <AppButton
        label={`Email ${SUPPORT_EMAIL}`}
        icon="mail"
        variant="secondary"
        style={styles.button}
        onPress={() => openMailTo(SUPPORT_EMAIL, "Report outdated information")}
      />
    </Screen>
  );
}

function Section({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  return (
    <View style={styles.section}>
      <AppText variant="title3" accessibilityRole="header" style={styles.heading}>
        {title}
      </AppText>
      <View style={styles.paragraphs}>
        {paragraphs.map((paragraph) => (
          <AppText key={paragraph} variant="reading" selectable>
            {paragraph}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    maxWidth: Layout.proseMaxWidth + Layout.screenPadding * 2,
    paddingTop: Spacing.sm,
  },
  lead: {
    marginTop: Spacing.md,
  },
  section: {
    marginTop: Spacing.xxxl,
  },
  heading: {
    marginBottom: Spacing.sm,
  },
  paragraphs: {
    gap: Spacing.md,
  },
  button: {
    marginTop: Spacing.xl,
  },
});
