import elements from '../../../shared/elements.json';
export const PERIODIC_ELEMENTS = elements;
export type PeriodicElement = typeof elements[number];
export const CATEGORY_COLORS: Record<string, {bg:string;text:string;border:string}> = Object.fromEntries(['alkali','alkaline_earth','transition_metal','post_transition','metalloid','reactive_nonmetal','halogen','noble_gas','lanthanide','actinide'].map((category,i)=>[category,{bg:['bg-red-50','bg-orange-50','bg-amber-50','bg-emerald-50','bg-teal-50','bg-blue-50','bg-violet-50','bg-purple-50','bg-rose-50','bg-pink-50'][i],text:'text-slate-800',border:'border-slate-200'}]));
