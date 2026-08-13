"use client";

import { UNIT_OPTIONS, UNIT_OTHER } from "@/lib/kebersihan/units.mjs";

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
    <div className="space-y-4">
      <div>
        <label htmlFor="unit" className="block text-sm font-medium">
          Unit
        </label>
        <select
          id="unit"
          value={unit}
          onChange={(event) => onUnitChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
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
        <div>
          <label htmlFor="unit-other" className="block text-sm font-medium">
            Tulis nama unit
          </label>
          <input
            id="unit-other"
            value={unitOther}
            onChange={(event) => onUnitOtherChange(event.target.value)}
            placeholder="Contoh: Unit Layanan Umum"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="area" className="block text-sm font-medium">
          Nama area
        </label>
        <input
          id="area"
          value={area}
          onChange={(event) => onAreaChange(event.target.value)}
          placeholder="Contoh: Laboratorium Komputer"
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
        />
      </div>

      <div>
        <span className="block text-sm font-medium">Anggota area</span>
        <p className="mt-1 text-xs text-muted-foreground">
          Tulis seluruh pegawai yang bertanggung jawab di area ini. Nama-nama ini
          otomatis masuk ke caption.
        </p>
        <div className="mt-2 space-y-2">
          {members.map((member, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={member}
                onChange={(event) => updateMember(index, event.target.value)}
                placeholder={`Anggota ${index + 1}`}
                className="w-full rounded-lg border border-border bg-card px-3 py-2"
              />
              {members.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  aria-label={`Hapus anggota ${index + 1}`}
                  className="shrink-0 rounded-lg border border-border px-3 text-sm"
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
          className="mt-2 rounded-lg border border-border px-3 py-2 text-sm font-medium"
        >
          + Tambah Anggota
        </button>
      </div>
    </div>
  );
}
