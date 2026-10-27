import { pubchem, fail } from "./_pubchem";
export default async function handler(req: any, res: any) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Chỉ hỗ trợ GET." });
  const cid = String(req.query?.cid ?? "");
  if (!/^\d{1,10}$/.test(cid) || Number(cid) < 1)
    return res.status(400).json({ error: "CID không hợp lệ." });
  try {
    let data,
      dimension = "3d";
    try {
      data = await pubchem(`/compound/cid/${cid}/SDF?record_type=3d`, true);
    } catch (error: any) {
      if (error.status !== 404) throw error;
      dimension = "2d";
      data = await pubchem(`/compound/cid/${cid}/SDF?record_type=2d`, true);
    }
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
    return res
      .status(200)
      .json({
        cid: Number(cid),
        dimension,
        format: "sdf",
        data,
        source: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      });
  } catch (error) {
    return fail(res, error);
  }
}
