export function PlatformGraphic({ compact = false }: { compact?: boolean }) {
  const gradient = compact ? "platform-blue-small" : "platform-blue";
  return <div className={`platform-graphic${compact ? " graphic-compact" : ""}`}>
    <div className="graphic-heading"><span className="caption">Visión de plataforma</span><span className="graphic-code" aria-hidden="true">M / 01</span></div>
    <svg className="platform-lines" viewBox="0 0 560 420" fill="none" aria-hidden="true">
      <defs><linearGradient id={gradient} x1="120" y1="80" x2="450" y2="340" gradientUnits="userSpaceOnUse"><stop stopColor="#9BBEFF" /><stop offset=".5" stopColor="#3D7DFF" /><stop offset="1" stopColor="#1243A7" /></linearGradient></defs>
      <path d="m280 45 210 118v95L280 377 70 258v-95L280 45Z" stroke="#34445C" /><path d="m280 85 175 100v55L280 340 105 240v-55L280 85Z" stroke="#253650" />
      <path d="M70 163 280 283l210-120M280 283v94M105 185l175 100 175-100M280 45v61" stroke="#34445C" />
      <path d="m155 154 52-30 73 84 73-84 52 30v98l-53 30v-77l-72 79-72-79v77l-53-30v-98Z" fill={`url(#${gradient})`} /><path d="m155 154 52 29 73 101 72-79 53-51M207 124v59" stroke="#B6D0FF" strokeOpacity=".45" />
      <circle cx="70" cy="163" r="4" fill="#97BAFF" /><circle cx="490" cy="163" r="4" fill="#97BAFF" /><circle cx="280" cy="377" r="4" fill="#3D7DFF" /><path d="M70 163H30M490 163h40M280 377v24" stroke="#6E8BB8" strokeDasharray="3 5" />
    </svg>
    <div className="graphic-foot"><span>Empresas</span><span>Sucursales</span><span>Personas</span></div>
  </div>;
}
