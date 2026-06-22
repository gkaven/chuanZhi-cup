import { useEffect, useRef } from 'react'

// 5只章鱼代号
const OCTOPUSES = [
  { key: 'master',   code: 'MASTER', name: '主控',   color: '#6366F1', x: 50, y: 30 },
  { key: 'resume',   code: 'RESUME', name: '简历师', color: '#10B981', x: 18, y: 72 },
  { key: 'audio',    code: 'AUDIO',  name: '听音师', color: '#F59E0B', x: 38, y: 85 },
  { key: 'quest',    code: 'QUEST',  name: '出题师', color: '#8B5CF6', x: 62, y: 85 },
  { key: 'writer',   code: 'WRITER', name: '写手',   color: '#EC4899', x: 82, y: 72 },
]

// 章鱼像素SVG（每只颜色不同）
function PixelOctopus({ color, size = 20 }: { color: string; size?: number }) {
  const s = size / 16
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect x="5" y="2" width="6" height="5" fill={color}/>
      <rect x="4" y="3" width="8" height="4" fill={color}/>
      <rect x="4" y="7" width="8" height="2" fill={color} opacity="0.8"/>
      <rect x="6" y="4" width="1" height="1" fill="#fff"/>
      <rect x="9" y="4" width="1" height="1" fill="#fff"/>
      <rect x="6" y="4" width="1" height="1" fill="#1a1a2e" opacity="0.7"/>
      <rect x="9" y="4" width="1" height="1" fill="#1a1a2e" opacity="0.7"/>
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

// 像素箱子
function PixelBox({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 8 8" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect x="1" y="2" width="6" height="5" fill={color} opacity="0.9"/>
      <rect x="1" y="2" width="6" height="1" fill="#fff" opacity="0.3"/>
      <rect x="3" y="3" width="2" height="2" fill="#fff" opacity="0.2"/>
    </svg>
  )
}

interface Props { activeAgent?: string | null; thinkSteps?: { agent?: string; message: string; type: string }[] }

export default function AgentFlow({ activeAgent, thinkSteps = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const progressRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = canvas.width = canvas.offsetWidth
    const H = canvas.height = canvas.offsetHeight

    const toPos = (oct: typeof OCTOPUSES[0]) => ({
      x: oct.x / 100 * W,
      y: oct.y / 100 * H,
    })

    // 找目标章鱼
    const targetKey = activeAgent === 'resume_eval' ? 'resume'
      : activeAgent === 'audio_analysis' ? 'audio'
      : activeAgent === 'question_gen' ? 'quest'
      : (activeAgent === 'cover_letter' || activeAgent === 'salary_negotiation' || activeAgent === 'career_plan') ? 'writer'
      : null

    const master = OCTOPUSES[0]
    const target = targetKey ? OCTOPUSES.find(o => o.key === targetKey) : null

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // 画连线
      OCTOPUSES.slice(1).forEach(oct => {
        const mp = toPos(master), op = toPos(oct)
        const isActive = oct.key === targetKey
        ctx.beginPath()
        ctx.moveTo(mp.x, mp.y + 10)
        ctx.lineTo(op.x, op.y - 10)
        ctx.strokeStyle = isActive ? oct.color + 'aa' : 'rgba(255,255,255,0.08)'
        ctx.lineWidth = isActive ? 1.5 : 0.8
        ctx.setLineDash(isActive ? [4, 3] : [2, 4])
        ctx.stroke()
        ctx.setLineDash([])
      })

      // 画章鱼节点
      OCTOPUSES.forEach(oct => {
        const p = toPos(oct)
        const isActive = oct.key === targetKey || (oct.key === 'master' && activeAgent)
        const r = isActive ? 22 : 18

        // 光晕
        if (isActive) {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r + 8)
          grad.addColorStop(0, oct.color + '40')
          grad.addColorStop(1, 'transparent')
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 8, 0, Math.PI * 2)
          ctx.fillStyle = grad; ctx.fill()
          // 脉冲环
          const pulse = (Math.sin(t * 0.08) + 1) / 2
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 4 + pulse * 6, 0, Math.PI * 2)
          ctx.strokeStyle = oct.color + '60'; ctx.lineWidth = 1; ctx.stroke()
        }

        // 背景圆
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fillStyle = isActive ? oct.color + '25' : 'rgba(255,255,255,0.04)'
        ctx.fill()
        ctx.strokeStyle = isActive ? oct.color : 'rgba(255,255,255,0.12)'
        ctx.lineWidth = isActive ? 1.5 : 1; ctx.stroke()

        // 代号文字
        ctx.font = `bold ${isActive ? 8 : 7}px monospace`
        ctx.fillStyle = isActive ? oct.color : 'rgba(255,255,255,0.5)'
        ctx.textAlign = 'center'
        ctx.fillText(oct.code, p.x, p.y - 4)
        ctx.font = `${isActive ? 7 : 6}px sans-serif`
        ctx.fillStyle = isActive ? '#fff' : 'rgba(255,255,255,0.35)'
        ctx.fillText(oct.name, p.x, p.y + 6)
      })

      // 动画：章鱼携箱子从 master 走向目标
      if (target && activeAgent) {
        t++
        const progress = (t % 120) / 120
        const mp = toPos(master), tp = toPos(target)
        // 贝塞尔曲线路径
        const cx = (mp.x + tp.x) / 2 + (Math.random() < 0.01 ? (Math.random() - 0.5) * 20 : 0)
        const cy = (mp.y + tp.y) / 2 - 20
        const bx = (1-progress)*(1-progress)*mp.x + 2*(1-progress)*progress*cx + progress*progress*tp.x
        const by = (1-progress)*(1-progress)*mp.y + 2*(1-progress)*progress*cy + progress*progress*tp.y

        // 画移动的章鱼
        ctx.save()
        ctx.translate(bx, by)
        // 方向翻转
        if (tp.x < mp.x) ctx.scale(-1, 1)
        // 走路摆动
        ctx.rotate(Math.sin(t * 0.3) * 0.15)

        // 章鱼身体（简化像素）
        const c = target.color
        ctx.fillStyle = c
        ctx.fillRect(-5, -8, 10, 8)
        ctx.fillRect(-6, -6, 12, 6)
        // 眼睛
        ctx.fillStyle = '#fff'
        ctx.fillRect(-3, -6, 2, 2)
        ctx.fillRect(1, -6, 2, 2)
        ctx.fillStyle = '#000'
        ctx.fillRect(-3, -6, 1, 1)
        ctx.fillRect(1, -6, 1, 1)
        // 触手
        ctx.fillStyle = c
        for (let i = -4; i <= 4; i += 2) {
          const wiggle = Math.sin(t * 0.4 + i) * 2
          ctx.fillRect(i - 1, 0, 2, 4 + wiggle)
        }
        // 箱子（举在头顶）
        ctx.fillStyle = '#F59E0B'
        ctx.fillRect(-4, -14, 8, 6)
        ctx.fillStyle = '#fff'
        ctx.fillRect(-4, -14, 8, 1)
        ctx.fillRect(-1, -13, 2, 3)

        ctx.restore()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [activeAgent])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      {!activeAgent && (
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          等待任务调度...
        </div>
      )}
    </div>
  )
}
