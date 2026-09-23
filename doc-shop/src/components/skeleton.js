/**
 * Skeleton Loader Component
 */

export const renderCardSkeletons = (count = 8) => {
  return Array.from({ length: count })
    .map(
      () => `
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 animate-pulse">
        <div class="w-full aspect-[4/3] rounded-xl bg-gray-200"></div>
        <div class="flex gap-2">
          <div class="h-5 w-16 bg-gray-200 rounded-full"></div>
          <div class="h-5 w-12 bg-gray-200 rounded-full"></div>
        </div>
        <div class="h-5 w-4/5 bg-gray-200 rounded"></div>
        <div class="h-4 w-1/2 bg-gray-200 rounded"></div>
        <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
          <div class="h-6 w-20 bg-gray-200 rounded"></div>
          <div class="h-8 w-16 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    `,
    )
    .join("");
};

export const renderTableSkeletons = (rows = 5, cols = 5) => {
  return Array.from({ length: rows })
    .map(
      () => `
      <tr class="animate-pulse">
        ${Array.from({ length: cols })
          .map(() => '<td class="px-4 py-4"><div class="h-4 bg-gray-200 rounded w-3/4"></div></td>')
          .join("")}
      </tr>
    `,
    )
    .join("");
};

export const renderKpiSkeletons = (count = 5) => {
  return Array.from({ length: count })
    .map(
      () => `
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
        <div class="h-4 w-24 bg-gray-200 rounded mb-2"></div>
        <div class="h-8 w-16 bg-gray-200 rounded"></div>
      </div>
    `,
    )
    .join("");
};
