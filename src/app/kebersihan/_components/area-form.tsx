"use client";

import { UNIT_OPTIONS, UNIT_OTHER } from "@/lib/kebersihan/units.mjs";

const FIELD =
  "mt-2 min-h-14 w-full rounded-xl border-2 border-border bg-card px-4 text-lg";

export function AreaForm({
  unit,
  unitOther,
  area,
  members,
  onUnitChange,
  onUnitOtherChange,
  onAreaChange,
  onMembersChange,
}: {
  unit: string;
  unitOther: string;
  area: string;
  members: string[];
  onUnitChange: (value: string) => void;
  onUnitOtherChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onMembersChange: (value: string[]) => void;
}) {
  function updateMember(index: number, value: string) {
    const next = [...members];
    next[index] = value;
    onMembersChange(next);
  }

  function addMember() {
    onMembersChange([...members, ""]);
  }

  function removeMember(index: number) {
    onMembersChange(members.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="unit" className="block text-lg font-semibold">
          Unit
        </label>
        <select
          id="unit"
          value={unit}
          onChange={(event) => onUnitChange(event.target.value)}
          className={FIELD}
        >
          <option value="">— Pilih unit —</option>
          {UNIT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {unit === UNIT_OTHER ? (
        <div className="ks-reveal">
          <label htmlFor="unit-other" className="block text-lg font-semibold">
            Tulis nama unit Anda
          </label>
          <input
            id="unit-other"
            value={unitOther}
            onChange={(event) => onUnitOtherChange(event.target.value)}
            placeholder="Contoh: Unit Layanan Umum"
            className={FIELD}
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="area" className="block text-lg font-semibold">
          Nama area
        </label>
        <p className="mt-1 text-base text-muted-foreground">
          Ruangan atau tempat yang Anda bersihkan.
        </p>
        <input
          id="area"
          value={area}
          onChange={(event) => onAreaChange(event.target.value)}
          placeholder="Contoh: Laboratorium Komputer"
          className={FIELD}
        />
      </div>

      <div>
        <span className="block text-lg font-semibold">Anggota area</span>
        <p className="mt-1 text-base text-muted-foreground">
          Tulis semua pegawai yang bertugas di area ini. Nama-nama ini otomatis
          masuk ke caption Instagram.
        </p>
        <div className="mt-2 space-y-3">
          {members.map((member, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={member}
                onChange={(event) => updateMember(index, event.target.value)}
                placeholder={`Nama anggota ${index + 1}`}
                aria-label={`Nama anggota ${index + 1}`}
                className="min-h-14 w-full rounded-xl border-2 border-border bg-card px-4 text-lg"
              />
              {members.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  aria-label={`Hapus anggota ${index + 1}`}
                  className="ks-press min-h-14 shrink-0 rounded-xl border-2 border-border px-4 text-base font-medium"
                >
                  Hapus
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addMember}
          className="ks-press mt-3 min-h-14 w-full rounded-xl border-2 border-dashed border-border px-4 text-lg font-semibold"
        >
          + Tambah Anggota
        </button>
      </div>
    </div>
  );
}
