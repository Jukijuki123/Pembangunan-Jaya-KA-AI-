"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AgregatDTO } from "./dto";

export function Charts({ a }: { a: AgregatDTO }) {
  const levelData = [
    { name: "MERAH", value: a.merah, fill: "#dc2626" },
    { name: "KUNING", value: a.kuning, fill: "#d97706" },
    { name: "HIJAU", value: a.hijau, fill: "#16a34a" },
  ];
  const instansiData = [
    { name: "Dinkes", value: a.perInstansi.DINAS_KESEHATAN },
    { name: "Dinsos", value: a.perInstansi.DINAS_SOSIAL },
    { name: "BPBD", value: a.perInstansi.BPBD },
  ];

  const adaData = a.merah + a.kuning + a.hijau > 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Breakdown Prioritas
        </p>
        {adaData ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={levelData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {levelData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
        <div className="mt-1 flex justify-center gap-3 text-xs">
          {levelData.map((d) => (
            <span key={d.name} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
              {d.name} ({d.value})
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Rujukan per Instansi
        </p>
        {adaData ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={instansiData}>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} width={24} />
              <Tooltip />
              <Bar dataKey="value" fill="#c8102e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
      Belum ada data
    </div>
  );
}
