export default function PresenceDot({ status }: { status?: "active"|"idle"|"offline" }) {
  const color =
    status === "active" ? "bg-emerald-400" :
    status === "idle"   ? "bg-yellow-400"  :
                          "bg-zinc-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}
