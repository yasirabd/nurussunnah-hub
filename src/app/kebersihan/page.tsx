import type { Metadata } from "next";
import { GeneratorClient } from "./_components/generator-client";
import { kebersihanFontVariables } from "./kebersihan-fonts";

export const metadata: Metadata = {
  title: "Generator Carousel Lomba Kebersihan 2026",
  description:
    "Buat 4 slide carousel Instagram Lomba Kebersihan Yayasan Islam Nurus Sunnah 2026 langsung dari HP Anda.",
};

export default function KebersihanPage() {
  return (
    <main className={`${kebersihanFontVariables} min-h-screen bg-background`}>
      <GeneratorClient />
    </main>
  );
}
