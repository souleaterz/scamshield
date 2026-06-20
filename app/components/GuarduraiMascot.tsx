export default function GuarduraiMascot({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 200 250"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g transform="translate(0,10)">
        {/* drop shadow */}
        <ellipse cx="100" cy="232" rx="44" ry="7" fill="#1e293b" opacity="0.12" />

        {/* ── BODY / TORSO ── */}
        <rect x="50" y="154" width="100" height="64" rx="18" fill="#1e3a8a" />
        <rect x="62" y="158" width="76" height="54" rx="12" fill="#1d4ed8" />
        <line x1="64" y1="172" x2="136" y2="172" stroke="#1e40af" strokeWidth="1.5" />
        <line x1="64" y1="184" x2="136" y2="184" stroke="#1e40af" strokeWidth="1.5" />
        {/* chest shield */}
        <path d="M82 163 L100 160 L118 163 L118 178 Q118 190 100 193 Q82 190 82 178 Z" fill="#3b82f6" stroke="#60a5fa" strokeWidth="1" />
        <path d="M91 168 L100 165 L109 168 L109 176 Q100 182 91 176 Z" fill="#93c5fd" opacity="0.8" />

        {/* ── SHOULDERS ── */}
        <path d="M30 158 L50 156 L50 194 L34 190 Q22 183 26 170 Z" fill="#1e3a8a" />
        <line x1="32" y1="168" x2="50" y2="166" stroke="#1e40af" strokeWidth="1.2" />
        <line x1="30" y1="178" x2="50" y2="176" stroke="#1e40af" strokeWidth="1.2" />
        <path d="M170 158 L150 156 L150 194 L166 190 Q178 183 174 170 Z" fill="#1e3a8a" />
        <line x1="150" y1="166" x2="168" y2="168" stroke="#1e40af" strokeWidth="1.2" />
        <line x1="150" y1="176" x2="170" y2="178" stroke="#1e40af" strokeWidth="1.2" />

        {/* ── ARMS ── */}
        <path d="M26 166 Q14 180 18 202 Q20 210 32 210 L46 206 L50 190 L32 176 Z" fill="#1e3a8a" />
        <ellipse cx="28" cy="214" rx="13" ry="10" fill="#fef3c7" />
        <path d="M174 166 Q186 180 182 202 Q180 210 168 210 L154 206 L150 190 L168 176 Z" fill="#1e3a8a" />
        <ellipse cx="172" cy="214" rx="13" ry="10" fill="#fef3c7" />

        {/* ── NECK + COLLAR ── */}
        <rect x="86" y="142" width="28" height="17" rx="6" fill="#fef3c7" />
        <rect x="80" y="152" width="40" height="10" rx="5" fill="#1e3a8a" />
        <rect x="80" y="154" width="40" height="2" rx="1" fill="#d97706" />

        {/* ── HEAD ── */}
        <ellipse cx="100" cy="97" rx="48" ry="44" fill="#fef3c7" />

        {/* ── HELMET DOME ── */}
        <path d="M52 97 Q52 36 100 32 Q148 36 148 97 Q148 78 100 74 Q52 78 52 97" fill="#1e3a8a" />
        <path d="M56 90 Q100 66 144 90" fill="#1d4ed8" />
        {/* helmet brim */}
        <path d="M44 100 Q100 90 156 100 L152 112 Q100 104 48 112 Z" fill="#1e3a8a" />
        <path d="M46 105 Q100 97 154 105" stroke="#d97706" strokeWidth="1.5" fill="none" />
        {/* center ridge */}
        <line x1="100" y1="32" x2="100" y2="100" stroke="#d97706" strokeWidth="2.5" />
        <path d="M100 32 Q76 54 54 92" stroke="#d97706" strokeWidth="1" fill="none" opacity="0.5" />
        <path d="M100 32 Q124 54 146 92" stroke="#d97706" strokeWidth="1" fill="none" opacity="0.5" />

        {/* ── FUKIGAESHI (side wing ornaments) ── */}
        <path d="M52 86 Q30 72 36 50 Q44 66 54 82 Z" fill="#d97706" />
        <circle cx="40" cy="66" r="4" fill="#fef3c7" opacity="0.7" />
        <path d="M148 86 Q170 72 164 50 Q156 66 146 82 Z" fill="#d97706" />
        <circle cx="160" cy="66" r="4" fill="#fef3c7" opacity="0.7" />

        {/* ── MAEDATE (front crest) ── */}
        <path d="M91 36 L100 14 L109 36" fill="#d97706" stroke="#b45309" strokeWidth="0.8" />
        <circle cx="100" cy="12" r="10" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
        <path d="M100 6 L101.5 9.5 L105.5 9.5 L102.5 11.8 L103.5 15.5 L100 13.2 L96.5 15.5 L97.5 11.8 L94.5 9.5 L98.5 9.5 Z" fill="#1e3a8a" />

        {/* ── FACE ── */}
        <ellipse cx="78" cy="101" rx="12" ry="11" fill="white" />
        <ellipse cx="122" cy="101" rx="12" ry="11" fill="white" />
        <circle cx="80" cy="102" r="7.5" fill="#1e3a8a" />
        <circle cx="120" cy="102" r="7.5" fill="#1e3a8a" />
        <circle cx="81" cy="103" r="4" fill="#0f172a" />
        <circle cx="121" cy="103" r="4" fill="#0f172a" />
        <circle cx="78.5" cy="100" r="2.5" fill="white" />
        <circle cx="118.5" cy="100" r="2.5" fill="white" />
        <circle cx="82" cy="105" r="1.5" fill="white" opacity="0.5" />
        <circle cx="122" cy="105" r="1.5" fill="white" opacity="0.5" />
        {/* eyebrows */}
        <path d="M68 89 Q78 84 88 89" stroke="#92400e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M112 89 Q122 84 132 89" stroke="#92400e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* rosy cheeks */}
        <ellipse cx="63" cy="112" rx="10" ry="7" fill="#fda4af" opacity="0.5" />
        <ellipse cx="137" cy="112" rx="10" ry="7" fill="#fda4af" opacity="0.5" />
        {/* smile */}
        <path d="M86 121 Q100 133 114 121" stroke="#92400e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
