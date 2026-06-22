import { useState, useEffect, useRef } from 'react'
import { Form, Input, Button, message } from 'antd'
import api from '../services/api'

// 像素章鱼 SVG
const OctopusSVG = () => (
  <svg width="64" height="64" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }} xmlns="http://www.w3.org/2000/svg">
    {/* 身体 */}
    <rect x="5" y="2" width="6" height="5" fill="#8B5CF6"/>
    <rect x="4" y="3" width="8" height="4" fill="#8B5CF6"/>
    <rect x="4" y="7" width="8" height="2" fill="#7C3AED"/>
    {/* 眼睛 */}
    <rect x="6" y="4" width="1" height="1" fill="#fff"/>
    <rect x="9" y="4" width="1" height="1" fill="#fff"/>
    <rect x="6" y="4" width="1" height="1" fill="#1a1a2e"/>
    <rect x="9" y="4" width="1" height="1" fill="#1a1a2e"/>
    {/* 高光 */}
    <rect x="6" y="4" width="1" height="1" fill="#60A5FA" opacity="0.6"/>
    <rect x="9" y="4" width="1" height="1" fill="#60A5FA" opacity="0.6"/>
    {/* 触手 */}
    <rect x="3" y="9" width="1" height="3" fill="#7C3AED"/>
    <rect x="2" y="12" width="1" height="1" fill="#6D28D9"/>
    <rect x="5" y="9" width="1" height="4" fill="#8B5CF6"/>
    <rect x="4" y="13" width="2" height="1" fill="#7C3AED"/>
    <rect x="7" y="9" width="1" height="4" fill="#8B5CF6"/>
    <rect x="7" y="13" width="2" height="1" fill="#7C3AED"/>
    <rect x="10" y="9" width="1" height="4" fill="#8B5CF6"/>
    <rect x="9" y="13" width="2" height="1" fill="#7C3AED"/>
    <rect x="12" y="9" width="1" height="3" fill="#7C3AED"/>
    <rect x="13" y="12" width="1" height="1" fill="#6D28D9"/>
    {/* 腮红 */}
    <rect x="4" y="6" width="2" height="1" fill="#EC4899" opacity="0.5"/>
    <rect x="10" y="6" width="2" height="1" fill="#EC4899" opacity="0.5"/>
    {/* 天线 */}
    <rect x="6" y="1" width="1" height="2" fill="#A78BFA"/>
    <rect x="9" y="1" width="1" height="2" fill="#A78BFA"/>
    <rect x="5" y="1" width="1" height="1" fill="#C4B5FD"/>
    <rect x="10" y="1" width="1" height="1" fill="#C4B5FD"/>
  </svg>
)

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    // 多层粒子：大中小三种
    const layers = [
      Array.from({ length: 80 }, () => ({ x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-0.5)*0.5, vy:(Math.random()-0.5)*0.5, r:Math.random()*1.5+0.5, color:'rgba(99,102,241,' })),
      Array.from({ length: 40 }, () => ({ x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2, r:Math.random()*3+2, color:'rgba(139,92,246,' })),
      Array.from({ length: 20 }, () => ({ x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-0.5)*0.1, vy:(Math.random()-0.5)*0.1, r:Math.random()*5+4, color:'rgba(59,130,246,' })),
    ]
    // 流星
    const meteors: {x:number,y:number,len:number,speed:number,opacity:number,active:boolean}[] = Array.from({length:5},()=>({x:0,y:0,len:80,speed:8,opacity:0,active:false}))
    let t = 0

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      t++

      // 随机触发流星
      if (t % 120 === 0) {
        const m = meteors.find(m => !m.active)
        if (m) { m.x = Math.random()*w; m.y = 0; m.opacity = 1; m.active = true }
      }
      meteors.forEach(m => {
        if (!m.active) return
        m.x += m.speed * 0.7; m.y += m.speed
        m.opacity -= 0.015
        if (m.opacity <= 0) { m.active = false; return }
        const grad = ctx.createLinearGradient(m.x-m.len*0.7, m.y-m.len, m.x, m.y)
        grad.addColorStop(0, `rgba(255,255,255,0)`)
        grad.addColorStop(1, `rgba(255,255,255,${m.opacity})`)
        ctx.beginPath(); ctx.moveTo(m.x-m.len*0.7, m.y-m.len); ctx.lineTo(m.x, m.y)
        ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.stroke()
      })

      // 粒子层
      layers.forEach((pts, li) => {
        pts.forEach(p => {
          p.x += p.vx; p.y += p.vy
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
          const alpha = li === 2 ? 0.08 + Math.sin(t*0.02)*0.04 : 0.6
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2)
          ctx.fillStyle = p.color + alpha + ')'; ctx.fill()
        })
        // 连线（只对小粒子层）
        if (li === 0) {
          for (let i = 0; i < pts.length; i++)
            for (let j = i+1; j < pts.length; j++) {
              const dx = pts[i].x-pts[j].x, dy = pts[i].y-pts[j].y
              const d = Math.sqrt(dx*dx+dy*dy)
              if (d < 100) {
                ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
                ctx.strokeStyle = `rgba(99,102,241,${0.12*(1-d/100)})`; ctx.lineWidth=0.5; ctx.stroke()
              }
            }
        }
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(135deg,#060a14 0%,#0a0e1a 40%,#0d1b3e 70%,#1a0533 100%)' }} />
}

const inputStyle: React.CSSProperties = {
  background: '#0D1526',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#E2E8F0',
  borderRadius: 8,
  height: 42,
}

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      if (isRegister) {
        await api.post('/auth/register', values)
        message.success('注册成功，请登录')
        setIsRegister(false)
      } else {
        const res = await api.post('/auth/login', values)
        localStorage.setItem('token', res.data.access_token)
        onLogin()
      }
    } catch (e: any) {
      message.error(e.response?.data?.detail || '操作失败，请检查网络')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ParticleCanvas />
      <div style={{
        position: 'relative', zIndex: 1, width: 400, padding: '36px 40px',
        background: 'rgba(13,21,38,0.85)', backdropFilter: 'blur(20px)',
        borderRadius: 20, border: '1px solid rgba(99,102,241,0.25)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(99,102,241,0.1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <OctopusSVG />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>章鱼面试助手</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>多 Agent 协同 · AI 驱动求职</div>
        </div>

        <Form onFinish={onFinish} layout="vertical">
          {isRegister && (
            <Form.Item name="username" label={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>用户名</span>} rules={[{ required: true }]}>
              <Input style={inputStyle} />
            </Form.Item>
          )}
          <Form.Item name="email" label={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>邮箱</span>} rules={[{ required: true, type: 'email' }]}>
            <Input style={inputStyle} />
          </Form.Item>
          <Form.Item name="password" label={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>密码</span>} rules={[{ required: true }]}>
            <Input.Password
              style={inputStyle}
              styles={{ input: { background: '#0D1526', color: '#E2E8F0', WebkitTextFillColor: '#E2E8F0' } }}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block
            style={{ borderRadius: 10, height: 44, marginTop: 8, fontSize: 15, fontWeight: 600, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
            {isRegister ? '注 册' : '登 录'}
          </Button>
          <Button type="link" block onClick={() => setIsRegister(!isRegister)}
            style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 13 }}>
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </Button>
        </Form>
      </div>
    </div>
  )
}
