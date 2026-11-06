import { Fragment, type PropsWithChildren } from "react";

/**
 * Wraps the content of a bottom tab. Tabs switch instantly, like every
 * UITabBarController app: an extra fade on focus delayed content and hid the
 * native large-title scroll view from the navigation bar.
 */
export function TabScreen({ children }: PropsWithChildren) {
  return <Fragment>{children}</Fragment>;
}
