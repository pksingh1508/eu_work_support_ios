export type FaqListItem = {
  id: string;
  question: string;
  answer: string;
};

export type FaqListProps = {
  items: FaqListItem[];
  footer?: string;
};
