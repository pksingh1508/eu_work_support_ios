import { Screen } from "@/components/ui/screen";
import { FAQs } from "@/constants/FAQ";
import { FaqList } from "@/features/faq/faq-list";

export default function FAQScreen() {
  return (
    <Screen nativeHeader padded={false} edges={[]}>
      <FaqList
        items={FAQs}
        footer="Quick answers for using EU Work Support and managing your guides."
      />
    </Screen>
  );
}
