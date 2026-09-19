"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { saveHomeCategoryTileAction } from "@/domains/content/actions";
import type { HomeCategoryTile } from "@/domains/content/home-category-tiles";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

function TileForm({ tile }: { tile: HomeCategoryTile }) {
  const [state, formAction] = useActionState(saveHomeCategoryTileAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-white p-4"
    >
      <input type="hidden" name="tileKey" value={tile.key} />
      <h3 className="m-0 text-[0.95rem] font-semibold text-ink">{tile.label}</h3>
      {!state.ok && (
        <p role="alert" className="text-[0.8rem] text-red-700">
          {state.error}
        </p>
      )}
      <ImagePicker name="imageUrl" folder="categories" label="تصویر (مربع)" defaultValue={tile.imageUrl} />
      <SubmitButton pendingLabel="در حال ذخیره...">ذخیره</SubmitButton>
    </form>
  );
}

/** One card per homepage category square: pick / change / remove its picture. */
export function HomeCategoryTilesManager({ tiles }: { tiles: HomeCategoryTile[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <TileForm key={tile.key} tile={tile} />
      ))}
    </div>
  );
}
