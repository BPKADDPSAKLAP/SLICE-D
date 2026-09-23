import Image from "next/image";

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/images/logo-denpasar.png"
        alt="Logo Kota Denpasar"
        width={28}
        height={28}
      />
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-wide text-white">SLICE-D</p>
        <p className="text-[10px] text-white/60">Kota Denpasar</p>
      </div>
    </div>
  );
}
