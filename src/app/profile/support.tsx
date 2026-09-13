import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { IconBadge } from "@/components/ui/icon-badge";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Surface } from "@/components/ui/surface";
import { Spacing } from "@/constants/theme";
import { openMailTo } from "@/lib/url";

const SUPPORT_EMAIL = "support@euworksupport.eu";

export default function SupportScreen() {
  const router = useRouter();

  return (
    <Screen scroll header={<ScreenHeader padded title="Support" />}>
      <Entrance index={0}>
        <Surface tone="primary" style={styles.hero}>
          <IconBadge icon="support" tone="primary" size={52} />
          <AppText variant="title2" style={styles.heroTitle}>
            We're here to help
          </AppText>
          <AppText variant="subhead" color="textSecondary">
            Questions about a guide, your account or something that looks out of
            date? Reach the team directly.
          </AppText>
        </Surface>
      </Entrance>

      <Entrance index={1} style={styles.section}>
        <ListGroup title="Get in touch">
          <ListRow
            icon="mail"
            title="Contact support"
            subtitle={SUPPORT_EMAIL}
            onPress={() => openMailTo(SUPPORT_EMAIL, "Contact Support")}
          />
          <ListRow
            icon="reportProblem"
            title="Report a problem"
            subtitle="Tell us about outdated or incorrect information"
            onPress={() => openMailTo(SUPPORT_EMAIL, "Report a Problem")}
          />
        </ListGroup>
      </Entrance>

      <Entrance index={2} style={styles.section}>
        <ListGroup title="Self-service">
          <ListRow
            icon="help"
            title="FAQ"
            subtitle="Answers to common questions"
            onPress={() => router.push("/profile/faq")}
          />
          <ListRow
            icon="sources"
            title="Sources and disclaimer"
            subtitle="How our guides are researched"
            onPress={() => router.push("/profile/sources-and-disclaimer")}
          />
        </ListGroup>
      </Entrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.sm,
  },
  heroTitle: {
    marginTop: Spacing.sm,
  },
  section: {
    marginTop: Spacing.xxl,
  },
});
