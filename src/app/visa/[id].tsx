import { PremiumGuard } from "@/features/auth/components/premium-guard";
import { DocumentScreen } from "@/features/documents/document-screen";

export default function VisaDocumentRoute() {
  return (
    <PremiumGuard>
      <DocumentScreen />
    </PremiumGuard>
  );
}
