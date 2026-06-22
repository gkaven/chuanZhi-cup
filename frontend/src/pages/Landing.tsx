import { useEffect, useRef } from 'react'
import { Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  FileTextOutlined, AudioOutlined, BulbOutlined,
  ArrowRightOutlined, ThunderboltOutlined, SafetyOutlined, TrophyOutlined
} from '@ant-design/icons'
import { OctopusIcon } from '../components/OctopusIcon'

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight
    window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight })
    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }))
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(99,102,241,0.6)'; ctx.fill()
      })
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 100) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - d / 100)})`; ctx.stroke()
          }
        }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
}

const FEATURES = [
  { icon: <FileTextOutlined />, title: '简历评估', desc: 'AI深度分析简历质量，查重检测，给出专业改进建议' },
  { icon: <AudioOutlined />, title: '录音分析', desc: '讯飞ASR转写面试录音，逐题评估答案准确性' },
  { icon: <BulbOutlined />, title: '面试题生成', desc: '基于简历内容，结合RAG知识库，生成个性化面试题' },
  { icon: <OctopusIcon size={28} color="var(--primary)" />, title: '多Agent协同', desc: '1个主Agent + 6个专业子Agent，智能路由调度' },
]

const STATS = [
  { icon: <ThunderboltOutlined />, value: '6+', label: '专业 Agent' },
  { icon: <SafetyOutlined />, value: 'RAG', label: '知识库增强' },
  { icon: <TrophyOutlined />, value: 'ASR', label: '语音识别' },
]

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const nav = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gradient-bg)', position: 'relative', overflow: 'hidden' }}>
      <ParticleCanvas />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Nav */}
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <OctopusIcon size={24} color="var(--primary)" />
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>章鱼面试助手</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button type="text" style={{ color: 'var(--text-dim)' }} onClick={onEnter}>登录</Button>
            <Button type="primary" onClick={onEnter} style={{ borderRadius: 8 }}>开始使用</Button>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '100px 48px 80px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, marginBottom: 24, fontSize: 13, color: 'var(--primary)' }}>
            <ThunderboltOutlined /> 第八届传智杯 AI 大模型国赛作品
          </div>
          <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, background: 'linear-gradient(135deg, #fff 0%, #6366F1 60%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI 驱动的<br />章鱼面试助手
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-dim)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
            多 Agent 协同系统，为大学生提供简历评估、面试录音分析、面试题生成等全方位求职辅助服务
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={onEnter}
              style={{ height: 48, padding: '0 32px', borderRadius: 10, fontSize: 16 }}>
              立即体验
            </Button>
            <Button size="large" style={{ height: 48, padding: '0 32px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onClick={() => nav('/admin')}>
              后台管理
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '0 48px 80px' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{ padding: '0 48px 100px' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 48, color: 'var(--text)' }}>核心功能</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, maxWidth: 1000, margin: '0 auto' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ padding: 28, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-active)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ fontSize: 28, color: 'var(--primary)', marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
