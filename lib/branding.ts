import { APP_NAME } from "./config";

export function brand(text: string) {
  return text.replace(/CivicPulse/gi, APP_NAME);
}