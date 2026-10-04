"use client";

import { ImagePicker } from "@/components/admin/ImagePicker";
import { saveHomeCategoryTileAction } from "@/domains/content/actions";
import type { HomeCategoryTile } from "@/domains/content/home-category-tiles";
import type { ActionResult } from "@/domains/auth/roles";
import { AdminSubmitButton, FormAlert, useAdminAction } from "@/components/admin/ui/form";

const initialState: ActionResult = { ok: true };

function TileForm({ tile }: { tile: HomeCategoryTile }) {
  const [state, formAction] = useAdminAction(saveHomeCategoryTileAction, initialState, {
    successMessage: `تصویر «${tile.label}» ذخیره شد`,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-line bg-white p-4">
      <input type="hidden" name="tileKey" value={tile.key} />
      <h3 className="m-0 text-[0.95rem] font-bold text-ink">{tile.label}</h3>
      <FormAlert state={state} />
      <ImagePicker name="imageUrl" folder="categories" label="تصویر" shape="square" defaultValue={tile.imageUrl} hint="تصویر مربع" />
      <AdminSubmitButton size="sm" className="w-fit">
        ذخیره
      </AdminSubmitButton>
    </form>
  );
}

/** One card per homepage category square: pick / change / remove its picture. */
export function HomeCategoryTilesManager({ tiles }: { tiles: HomeCategoryTile[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tiles.map((tile) => (
        <TileForm key={tile.key} tile={tile} />
      ))}
    </div>
  );
}
