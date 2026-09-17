import { Product, Accessory, RawMaterial, ConsumptionDetail, RawMaterialSummary } from '../types';

export interface CalculationInputRow {
  accessoryId: string;
  qtyPerProduct: number;
  rawMaterialId: string;
  yieldPerUnit: number;
  allowancePercent: number; // susut / waste %
}

export function calculateConsumption(
  product: Product,
  orderQuantity: number,
  allAccessories: Accessory[],
  allRawMaterials: RawMaterial[],
  customOverrides?: Record<string, Partial<CalculationInputRow>>,
  efficiencyFactorPercent: number = 0 // e.g. -7% nesting saving or +5% safety allowance
): { details: ConsumptionDetail[]; summary: RawMaterialSummary[] } {
  const details: ConsumptionDetail[] = [];
  const rawMaterialGroups: Record<
    string,
    {
      material: RawMaterial;
      totalCalculated: number;
      breakdown: Array<{
        accessoryName: string;
        accessoryQty: number;
        yieldPerUnit: number;
        rawMaterialPortion: number;
      }>;
    }
  > = {};

  // For each accessory in the product
  for (const rel of product.accessories) {
    const accessory = allAccessories.find((a) => a.id === rel.accessoryId);
    if (!accessory) continue;

    const override = customOverrides ? customOverrides[accessory.id] : undefined;
    const qtyPerProduct = override?.qtyPerProduct !== undefined ? override.qtyPerProduct : rel.qtyPerProduct;
    const rawMaterialId = override?.rawMaterialId || accessory.defaultRawMaterialId;
    const yieldPerUnit = override?.yieldPerUnit !== undefined && override.yieldPerUnit > 0
      ? override.yieldPerUnit
      : (accessory.defaultYieldPerUnit || 1);
    const allowancePercent = override?.allowancePercent !== undefined ? override.allowancePercent : 0;

    const rawMaterial = allRawMaterials.find((m) => m.id === rawMaterialId) || {
      id: rawMaterialId,
      code: 'UNKNOWN',
      name: 'Bahan Baku Tidak Diketahui',
      specification: '-',
      unit: 'Unit',
      currentStock: 0,
      createdAt: '',
      updatedAt: '',
    };

    const totalAccessoryNeeded = Math.round(orderQuantity * qtyPerProduct);
    const baseRawMaterialNeeded = yieldPerUnit > 0 ? totalAccessoryNeeded / yieldPerUnit : 0;
    const rawMaterialWithAllowance = baseRawMaterialNeeded * (1 + allowancePercent / 100);

    const detailItem: ConsumptionDetail = {
      accessoryId: accessory.id,
      accessoryName: accessory.name,
      qtyPerProduct,
      totalAccessoryNeeded,
      rawMaterialId: rawMaterial.id,
      rawMaterialName: rawMaterial.name,
      rawMaterialSpec: rawMaterial.specification,
      rawMaterialUnit: rawMaterial.unit,
      yieldPerUnit,
      rawMaterialCalculated: Number(baseRawMaterialNeeded.toFixed(4)),
      allowancePercent,
      rawMaterialWithAllowance: Number(rawMaterialWithAllowance.toFixed(4)),
    };

    details.push(detailItem);

    if (!rawMaterialGroups[rawMaterial.id]) {
      rawMaterialGroups[rawMaterial.id] = {
        material: rawMaterial,
        totalCalculated: 0,
        breakdown: [],
      };
    }

    rawMaterialGroups[rawMaterial.id].totalCalculated += rawMaterialWithAllowance;
    rawMaterialGroups[rawMaterial.id].breakdown.push({
      accessoryName: accessory.name,
      accessoryQty: totalAccessoryNeeded,
      yieldPerUnit,
      rawMaterialPortion: Number(rawMaterialWithAllowance.toFixed(4)),
    });
  }

  // Generate summaries
  const summary: RawMaterialSummary[] = Object.values(rawMaterialGroups).map((group) => {
    // Apply efficiency / nesting factor if set
    let finalTotal = group.totalCalculated;
    if (efficiencyFactorPercent !== 0) {
      finalTotal = finalTotal * (1 + efficiencyFactorPercent / 100);
    }

    const rounded2Decimals = Number(finalTotal.toFixed(2));
    const roundedCeil = Math.ceil(finalTotal);

    return {
      rawMaterialId: group.material.id,
      rawMaterialName: group.material.name,
      specification: group.material.specification,
      unit: group.material.unit,
      totalRequired: rounded2Decimals,
      roundedRequired: roundedCeil,
      breakdown: group.breakdown,
    };
  });

  return { details, summary };
}
