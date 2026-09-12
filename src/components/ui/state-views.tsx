import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { IconBadge, type IconBadgeTone } from "@/components/ui/icon-badge";
import type { IconName } from "@/components/ui/icon-names";
import { Spinner } from "@/components/ui/spinner";
import { Surface } from "@/components/ui/surface";
import { Spacing } from "@/constants/theme";

type StateAction = {
  label: string;
  onPress: () => void;
};

type LoadingStateProps = {
  label?: string;
  style?: StyleProp<ViewStyle>;
};

type MessageStateProps = {
  icon: IconName;
  tone?: IconBadgeTone;
  title: string;
  message?: string;
  action?: StateAction;
  secondaryAction?: StateAction;
  style?: StyleProp<ViewStyle>;
};

export function LoadingState({ label = "Loading…", style }: LoadingStateProps) {
  return (
    <Entrance from="none" style={style}>
      <Surface style={styles.card}>
        <Spinner size={34} />
        <AppText variant="callout" color="textSecondary" style={styles.loadingLabel}>
          {label}
        </AppText>
      </Surface>
    </Entrance>
  );
}

function MessageState({
  icon,
  tone = "primary",
  title,
  message,
  action,
  secondaryAction,
  style,
}: MessageStateProps) {
  return (
    <Entrance style={style}>
      <Surface style={styles.card}>
        <IconBadge icon={icon} tone={tone} size={56} radius="lg" />
        <AppText variant="title3" align="center" style={styles.title}>
          {title}
        </AppText>
        {message ? (
          <AppText
            variant="subhead"
            color="textSecondary"
            align="center"
            style={styles.message}
          >
            {message}
          </AppText>
        ) : null}
        {action || secondaryAction ? (
          <View style={styles.actions}>
            {action ? (
              <AppButton
                label={action.label}
                onPress={action.onPress}
                size="md"
              />
            ) : null}
            {secondaryAction ? (
              <AppButton
                label={secondaryAction.label}
                onPress={secondaryAction.onPress}
                variant="ghost"
                size="md"
              />
            ) : null}
          </View>
        ) : null}
      </Surface>
    </Entrance>
  );
}

export function EmptyState(props: Omit<MessageStateProps, "tone"> & { tone?: IconBadgeTone }) {
  return <MessageState tone="primary" {...props} />;
}

export function ErrorState({
  title = "Something went wrong",
  icon = "warning",
  ...props
}: Partial<Pick<MessageStateProps, "title" | "icon">> &
  Omit<MessageStateProps, "title" | "icon" | "tone">) {
  return <MessageState tone="danger" icon={icon} title={title} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
  },
  loadingLabel: {
    marginTop: Spacing.lg,
  },
  title: {
    marginTop: Spacing.lg,
  },
  message: {
    marginTop: Spacing.sm,
    maxWidth: 300,
  },
  actions: {
    marginTop: Spacing.xl,
    alignSelf: "stretch",
    gap: Spacing.sm,
  },
});
