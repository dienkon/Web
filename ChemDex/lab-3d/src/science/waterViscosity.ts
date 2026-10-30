/** IAPWS R12-08, Eqs10–12, Tables1–2, with critical enhancement mu2=1.
 * Inputs kelvin and kg/m3; output Pa.s. Caller owns the thermodynamic-state
 * validity/EOS. This background correlation alone is incomplete near Tc.
 * https://iapws.org/public/documents/FPpx6/visc.pdf */
export function waterBackgroundViscosity_Pa_s(temperature_K: number, density_kg_m3: number): number | null {
  if (![temperature_K,density_kg_m3].every(Number.isFinite) || !(temperature_K>0) || density_kg_m3<0) return null;
  const t=temperature_K/647.096, rho=density_kg_m3/322;
  const inverseT=1/t, x=inverseT-1, y=rho-1;
  const dilute=100*Math.sqrt(t)/(1.67752+2.20462*inverseT+0.6366564*inverseT**2-0.241605*inverseT**3);
  let sum=0;
  for (const [i,j,h] of DENSITY_TERMS) sum+=h*x**i*y**j;
  const viscosity=1e-6*dilute*Math.exp(rho*sum);
  return Number.isFinite(viscosity)&&viscosity>0 ? viscosity : null;
}

/** R12-08 Eq13: enhancement may exceed2% inside these open bounds.
 * Outside does not mean exact zero enhancement, only the simplified closure. */
export function waterViscosityNeedsCriticalEnhancement(temperature_K: number,density_kg_m3: number): boolean {
  return temperature_K>645.91 && temperature_K<650.77 && density_kg_m3>245.8 && density_kg_m3<405.3;
}

const DENSITY_TERMS = [
  [0,0,0.520094],[1,0,0.0850895],[2,0,-1.08374],[3,0,-0.289555],
  [0,1,0.222531],[1,1,0.999115],[2,1,1.88797],[3,1,1.26613],[5,1,0.120573],
  [0,2,-0.281378],[1,2,-0.906851],[2,2,-0.772479],[3,2,-0.489837],[4,2,-0.257040],
  [0,3,0.161913],[1,3,0.257399],[0,4,-0.0325372],[3,4,0.0698452],
  [4,5,0.00872102],[3,6,-0.00435673],[5,6,-0.000593264],
] as const;
