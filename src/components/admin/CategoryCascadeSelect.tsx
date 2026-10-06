"use client";

import { useMemo, useState } from "react";
import type { CategoryPickerNode } from "@/domains/categories/queries";
import { SelectField } from "@/components/admin/ui/form";

/**
 * Three linked dropdowns — جنسیت (gender/audience) → گروه → نوع — that
 * together pick the product's category. Only the final choice is submitted,
 * as `categoryId`; the server still checks that it exists and is a leaf, so
 * this component is purely a friendlier way to fill the same field.
 */
export function CategoryCascadeSelect({
  nodes,
  defaultCategoryId,
}: {
  nodes: CategoryPickerNode[];
  defaultCategoryId?: string;
}) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, CategoryPickerNode[]>();
    for (const node of nodes) {
      const list = map.get(node.parentId);
      if (list) list.push(node);
      else map.set(node.parentId, [node]);
    }
    return map;
  }, [nodes]);

  // Walk up from the saved category to prefill all three dropdowns.
  const initial = useMemo(() => {
    const trail: CategoryPickerNode[] = [];
    let current = defaultCategoryId ? byId.get(defaultCategoryId) : undefined;
    while (current && trail.length < 5) {
      trail.unshift(current);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return { gender: trail[0]?.id ?? "", group: trail[1]?.id ?? "", type: trail[2]?.id ?? "" };
  }, [byId, defaultCategoryId]);

  const [genderId, setGenderId] = useState(initial.gender);
  const [groupId, setGroupId] = useState(initial.group);
  const [typeId, setTypeId] = useState(initial.type);

  const genders = childrenOf.get(null) ?? [];
  const groups = genderId ? (childrenOf.get(genderId) ?? []) : [];
  const types = groupId ? (childrenOf.get(groupId) ?? []) : [];

  // A group with no types beneath it is itself a valid (leaf) category.
  const groupIsLeaf = Boolean(groupId) && types.length === 0;
  const categoryId = typeId || (groupIsLeaf ? groupId : "");

  const label = (node: CategoryPickerNode) => (node.isActive ? node.name : `${node.name} (غیرفعال)`);

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="categoryId" value={categoryId} />

      <SelectField
        label="جنسیت"
        name="categoryGender"
        required
        value={genderId}
        onChange={(event) => {
          setGenderId(event.target.value);
          setGroupId("");
          setTypeId("");
        }}
      >
        <option value="" disabled>
          انتخاب جنسیت
        </option>
        {genders.map((node) => (
          <option key={node.id} value={node.id}>
            {label(node)}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="گروه"
        name="categoryGroup"
        required
        disabled={!genderId}
        value={groupId}
        onChange={(event) => {
          setGroupId(event.target.value);
          setTypeId("");
        }}
      >
        <option value="" disabled>
          {genderId ? "انتخاب گروه" : "ابتدا جنسیت را انتخاب کنید"}
        </option>
        {groups.map((node) => (
          <option key={node.id} value={node.id}>
            {label(node)}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="نوع"
        name="categoryType"
        required={!groupIsLeaf}
        disabled={!groupId || groupIsLeaf}
        value={typeId}
        onChange={(event) => setTypeId(event.target.value)}
        hint={groupIsLeaf ? "این گروه زیرمجموعه ندارد؛ محصول مستقیماً در خود گروه ثبت می‌شود." : undefined}
      >
        <option value="" disabled>
          {groupId ? (groupIsLeaf ? "—" : "انتخاب نوع") : "ابتدا گروه را انتخاب کنید"}
        </option>
        {types.map((node) => (
          <option key={node.id} value={node.id}>
            {label(node)}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
