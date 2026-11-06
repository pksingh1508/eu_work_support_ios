import { useRouter } from "expo-router";

import { NativeList } from "@/components/ui/native-list";
import { Screen } from "@/components/ui/screen";
import { openMailTo } from "@/lib/url";

const SUPPORT_EMAIL = "support@euworksupport.eu";

export default function SupportScreen() {
  const router = useRouter();

  return (
    <Screen nativeHeader padded={false} edges={[]}>
      <NativeList
        sections={[
          {
            key: "contact",
            title: "Get in touch",
            footer: `Questions about a guide, your account, or something that looks out of date? Write to ${SUPPORT_EMAIL} and the team replies directly.`,
            rows: [
              {
                key: "contact",
                title: "Contact Support",
                icon: "mail",
                external: true,
                onPress: () => openMailTo(SUPPORT_EMAIL, "Contact Support"),
              },
              {
                key: "report",
                title: "Report a Problem",
                icon: "reportProblem",
                external: true,
                onPress: () => openMailTo(SUPPORT_EMAIL, "Report a Problem"),
              },
            ],
          },
          {
            key: "self-service",
            title: "Self-service",
            rows: [
              {
                key: "faq",
                title: "FAQ",
                icon: "help",
                onPress: () => router.push("/profile/faq"),
              },
              {
                key: "sources",
                title: "Sources and Disclaimer",
                icon: "sources",
                onPress: () => router.push("/profile/sources-and-disclaimer"),
              },
            ],
          },
        ]}
      />
    </Screen>
  );
}
