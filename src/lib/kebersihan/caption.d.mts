interface AreaIdentity {
  unit: string;
  area: string;
  members: string[];
}

export const HASHTAGS: string[];

export function instagramCaption(input: AreaIdentity): string;

export function instagramCaptionShort(input: AreaIdentity): string;

export function whatsappSubmission(
  input: AreaIdentity & { link: string }
): string;
