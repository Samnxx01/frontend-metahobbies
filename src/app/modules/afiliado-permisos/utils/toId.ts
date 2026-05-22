export const toId = (value: unknown): string =>
  String(
    (value as { _id?: string; iud?: string })?._id ||
      (value as { iud?: string })?.iud ||
      value ||
      ''
  ).trim();
