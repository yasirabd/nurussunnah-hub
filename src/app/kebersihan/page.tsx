import type { Metadata } from "next";
import { GeneratorClient } from "./_components/generator-client";
import { kebersihanFontVariables } from "./kebersihan-fonts";

export const metadata: Metadata = {
  title: "Generator Carousel Lomba 5R 2026",
  description:
    "Buat 4 slide carousel Instagram Lomba 5R Yayasan Islam Nurus Sunnah 2026 — Ringkas, Rapi, Resik, Rawat, Rajin — langsung dari HP Anda.",
};

export default function KebersihanPage() {
  return (
    <main className={`${kebersihanFontVariables} min-h-screen bg-background`}>
      <GeneratorClient />
    </main>
  );
}
