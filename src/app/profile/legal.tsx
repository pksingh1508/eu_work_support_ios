import { useRouter, type Href } from "expo-router";

import type { IconName } from "@/components/ui/icon-names";
import { NativeList } from "@/components/ui/native-list";
import { Screen } from "@/components/ui/screen";

const legalItems: Array<{ key: string; title: string; icon: IconName; href: Href }> = [
  {
    key: "privacy",
    title: "Privacy Policy",
    icon: "lockShield",
    href: "/profile/legal/privacy-policy",
  },
  {
    key: "terms",
    title: "Terms and Conditions",
    icon: "legal",
    href: "/profile/legal/terms-and-conditions",
  },
  {
    key: "deletion",
    title: "Data Deletion Policy",
    icon: "trash",
    href: "/profile/legal/data-deletion",
  },
  {
    key: "open-source",
    title: "Open Source Licences",
    icon: "book",
    href: "/profile/legal/open-source",
  },
];

export default function LegalScreen() {
  const router = useRouter();

  return (
    <Screen nativeHeader padded={false} edges={[]}>
      <NativeList
        sections={[
          {
            key: "policies",
            footer: "The policies that govern your use of EU Work Support.",
            rows: legalItems.map((item) => ({
              key: item.key,
              title: item.title,
              icon: item.icon,
              onPress: () => router.push(item.href),
            })),
          },
        ]}
      />
    </Screen>
  );
}
