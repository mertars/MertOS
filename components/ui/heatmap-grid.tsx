"use client";

import { eachDayOfInterval, format, subWeeks } from "date-fns";

/** GitHub tarzı ısı haritası — son N hafta × 7 gün. `doneDates` "yyyy-MM-dd" anahtarları. */
export function HeatmapGrid({ doneDates, colorVar, weeks = 10 }: { doneDates: Set<string>; colorVar: string; weeks?: number }) {
  const start = subWeeks(new Date(), weeks);
  const days = eachDayOfInterval({ start, end: new Date() });
  const leadingEmpty = days[0].getDay(); // Pazar=0 hizası
  const cells: (Date | null)[] = [...Array(leadingEmpty).fill(null), ...days];

  const columns: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  return (
    <div className="flex gap-1 overflow-x-auto">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {col.map((d, di) => {
            if (!d) return <div key={di} className="h-3 w-3" />;
            const key = format(d, "yyyy-MM-dd");
            const done = doneDates.has(key);
            return (
              <div
                key={di}
                className="h-3 w-3 rounded-[3px]"
                style={{ backgroundColor: done ? `var(${colorVar})` : "rgba(255,255,255,0.06)" }}
                title={key}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
