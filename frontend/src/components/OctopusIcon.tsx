// 像素章鱼图标 — 可复用组件
export function OctopusIcon({ size = 24, color = '#8B5CF6' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated', display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="5" y="2" width="6" height="5" fill={color}/>
      <rect x="4" y="3" width="8" height="4" fill={color}/>
      <rect x="4" y="7" width="8" height="2" fill={color} opacity="0.85"/>
      <rect x="6" y="4" width="1" height="1" fill="#fff"/>
      <rect x="9" y="4" width="1" height="1" fill="#fff"/>
      <rect x="6" y="4" width="1" height="1" fill="#1a1a2e" opacity="0.7"/>
      <rect x="9" y="4" width="1" height="1" fill="#1a1a2e" opacity="0.7"/>
      <rect x="4" y="6" width="2" height="1" fill="#EC4899" opacity="0.5"/>
      <rect x="10" y="6" width="2" height="1" fill="#EC4899" opacity="0.5"/>
      <rect x="3" y="9" width="1" height="3" fill={color} opacity="0.9"/>
      <rect x="2" y="12" width="1" height="1" fill={color} opacity="0.7"/>
      <rect x="5" y="9" width="1" height="4" fill={color}/>
      <rect x="4" y="13" width="2" height="1" fill={color} opacity="0.8"/>
      <rect x="7" y="9" width="1" height="4" fill={color}/>
      <rect x="7" y="13" width="2" height="1" fill={color} opacity="0.8"/>
      <rect x="10" y="9" width="1" height="4" fill={color}/>
      <rect x="9" y="13" width="2" height="1" fill={color} opacity="0.8"/>
      <rect x="12" y="9" width="1" height="3" fill={color} opacity="0.9"/>
      <rect x="13" y="12" width="1" height="1" fill={color} opacity="0.7"/>
      <rect x="6" y="1" width="1" height="2" fill={color} opacity="0.7"/>
      <rect x="9" y="1" width="1" height="2" fill={color} opacity="0.7"/>
    </svg>
  )
}
