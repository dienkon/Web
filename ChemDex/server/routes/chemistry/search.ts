import { pubchem, fail } from "./_pubchem";
export default async function handler(req: any, res: any) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Chỉ hỗ trợ GET." });
  const q = String(req.query?.q ?? "").trim();
  if (!q || q.length > 150 || /[\x00-\x1f]/.test(q))
    return res
      .status(400)
      .json({
        error: "Nhập tên, công thức hoặc CID hợp lệ (tối đa 150 ký tự).",
      });
  try {
    let ids: number[] = [];
    if (/^\d+$/.test(q)) ids = [Number(q)];
    else if (/^(?:[A-Z][a-z]?\d*)+$/.test(q)) {
      const result = await pubchem(
        `/compound/fastformula/${encodeURIComponent(q)}/cids/JSON?MaxRecords=12`,
      );
      ids = result.IdentifierList?.CID ?? [];
    } else {
      const result = await pubchem(
        `/compound/name/${encodeURIComponent(q)}/cids/JSON?name_type=word`,
      );
      ids = result.IdentifierList?.CID ?? [];
    }
    ids = ids.slice(0, 12);
    if (!ids.length) return res.status(200).json({ results: [] });
    const result = await pubchem(
      `/compound/cid/${ids.join(",")}/property/MolecularFormula,MolecularWeight,IUPACName,Charge,CovalentUnitCount/JSON`,
    );
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    return res
      .status(200)
      .json({
        results: result.PropertyTable.Properties.map((p: any) => ({
          cid: p.CID,
          name_en: p.IUPACName,
          formula: p.MolecularFormula,
          molarMass: Number(p.MolecularWeight),
          charge: Number(p.Charge) || 0,
          kind:
            Number(p.CovalentUnitCount) > 1
              ? "components"
              : Number(p.Charge)
                ? "ion"
                : "molecule",
          note:
            Number(p.CovalentUnitCount) > 1
              ? "Bản ghi gồm nhiều thành phần. Cần dữ liệu mạng tinh thể hoặc thành phần dung dịch được xác minh; không biểu diễn như một phân tử muối."
              : undefined,
        })),
      });
  } catch (error) {
    return fail(res, error);
  }
}
