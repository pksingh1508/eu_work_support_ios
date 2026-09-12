import { useRouter, type Href } from "expo-router";
import { StyleSheet } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import type { IconName } from "@/components/ui/icon-names";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Spacing } from "@/constants/theme";

const legalItems: Array<{ title: string; subtitle: string; icon: IconName; href: Href }> = [
  {
    title: "Privacy policy",
    subtitle: "How we collect, use and protect your data",
    icon: "lockShield",
    href: "/profile/legal/privacy-policy",
  },
  {
    title: "Terms and conditions",
    subtitle: "The rules for using EU Work Support",
    icon: "legal",
    href: "/profile/legal/terms-and-conditions",
  },
  {
    title: "Data deletion policy",
    subtitle: "What happens when you delete your account",
    icon: "trash",
    href: "/profile/legal/data-deletion",
  },
  {
    title: "Open source licences",
    subtitle: "Third-party software used in the app",
    icon: "book",
    href: "/profile/legal/open-source",
  },
];

export default function LegalScreen() {
  const router = useRouter();

  return (
    <Screen scroll header={<ScreenHeader padded title="Legal" />}>
      <Entrance from="none">
        <AppText variant="subhead" color="textSecondary" style={styles.intro}>
          The policies that govern your use of EU Work Support.
        </AppText>
      </Entrance>
      <Entrance index={1}>
        <ListGroup>
          {legalItems.map((item) => (
            <ListRow
              key={item.title}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => router.push(item.href)}
            />
          ))}
        </ListGroup>
      </Entrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: Spacing.xl,
  },
});
