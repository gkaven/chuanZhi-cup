import { useState, useRef, useEffect } from 'react'
import { Button, Input, Upload, message, Tag, Tooltip, Progress, Collapse, Badge, Dropdown } from 'antd'
import {
  PaperClipOutlined, SendOutlined, ApartmentOutlined,
  FileTextOutlined, AudioOutlined, BulbOutlined, MailOutlined,
  DollarOutlined, CompassOutlined, UserOutlined, LogoutOutlined,
  FileSearchOutlined, SettingOutlined, TeamOutlined, BookOutlined, PlayCircleOutlined, PlusOutlined
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { useNavigate } from 'react-router-dom'
import { OctopusIcon } from '../components/OctopusIcon'
import api from '../services/api'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  report?: any
  thinking?: ThinkStep[]
}

interface ThinkStep {
  type: 'routing' | 'progress' | 'result' | 'error'
  agent?: string
  step?: string
  message: string
  ts: number
}

const AGENTS = [
  { key: 'master', name: '面试助手', desc: '意图识别 · 路由调度', icon: <ApartmentOutlined />, color: '#1677ff', children: ['resume_eval', 'audio_analysis', 'question_gen', 'cover_letter', 'salary_negotiation', 'career_plan'] },
  { key: 'resume_eval', name: '简历评估', desc: '解析 · 查重 · 评分', icon: <FileTextOutlined />, color: '#52c41a' },
  { key: 'audio_analysis', name: '录音分析', desc: 'ASR · 问答分离 · 评估', icon: <AudioOutlined />, color: '#fa8c16' },
  { key: 'question_gen', name: '面试题生成', desc: 'RAG · 个性化出题', icon: <BulbOutlined />, color: '#722ed1' },
  { key: 'cover_letter', name: '求职信生成', desc: '简历匹配 · 个性化写作', icon: <MailOutlined />, color: '#13c2c2' },
  { key: 'salary_negotiation', name: '薪资谈判', desc: '市场数据 · 谈判策略', icon: <DollarOutlined />, color: '#eb2f96' },
  { key: 'career_plan', name: '职业规划', desc: '发展路径 · 行动建议', icon: <CompassOutlined />, color: '#faad14' },
]

const SHORTCUTS = [
  { label: '评估我的简历', icon: <FileTextOutlined />, hint: '请上传简历文件后发送', type: 'resume' },
  { label: '分析面试录音', icon: <AudioOutlined />, hint: '请上传录音文件后发送', type: 'audio' },
  { label: '生成面试题', icon: <BulbOutlined />, hint: '请上传简历文件后发送', type: 'resume' },
  { label: '写求职信', icon: <MailOutlined />, hint: '请上传简历并说明目标岗位', type: 'resume' },
  { label: '薪资参考', icon: <DollarOutlined />, hint: '请说明岗位、城市和工作年限', type: null },
  { label: '职业规划', icon: <CompassOutlined />, hint: '请描述你的背景和目标', type: null },
]

export default function Chat() {
  // 版本检查：清除旧缓存
  const CHAT_VER = 'v3'
  if (localStorage.getItem('chat_ver') !== CHAT_VER) {
    localStorage.removeItem('chat_msgs')
    localStorage.removeItem('session_id')
    localStorage.setItem('chat_ver', CHAT_VER)
  }

  const savedSession = localStorage.getItem('session_id') || undefined
  const savedMsgs = (() => { try { return JSON.parse(localStorage.getItem('chat_msgs') || '[]') } catch { return [] } })()

  const [msgs, setMsgs] = useState<Msg[]>(savedMsgs.length ? savedMsgs : [{ role: 'assistant', content: '你好！我是章鱼面试助手，可以帮你评估简历、分析面试录音、生成面试题、写求职信等。请上传文件或直接输入需求开始吧！' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(savedSession)
  const [pendingFile, setPendingFile] = useState<any>(null)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [thinkSteps, setThinkSteps] = useState<ThinkStep[]>([])
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nav = useNavigate()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, thinkSteps])
  useEffect(() => {
    api.get('/reports').then(r => setRecentReports(r.data)).catch(() => {})
    api.get('/auth/me').then(r => setUser(r.data)).catch(() => {})
    api.get('/sessions').then(r => setSessions(r.data)).catch(() => {})
  }, [])

  const startNewSession = () => {
    const newId = undefined
    setSessionId(newId)
    setMsgs([{ role: 'assistant', content: '你好！我是章鱼面试助手，可以帮你评估简历、分析面试录音、生成面试题、写求职信等。请上传文件或直接输入需求开始吧！' }])
    localStorage.removeItem('session_id')
    localStorage.removeItem('chat_msgs')
  }

  const switchSession = async (sid: string) => {
    try {
      const res = await api.get(`/sessions/${sid}`)
      const history: any[] = Array.isArray(res.data) ? res.data : (res.data.messages || [])
      const converted: Msg[] = history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content, report: m.report }))
      if (converted.length > 0) {
        setMsgs(converted)
        setSessionId(sid)
        localStorage.setItem('session_id', sid)
        localStorage.setItem('chat_msgs', JSON.stringify(converted))
      } else {
        message.warning('该会话暂无消息记录')
      }
    } catch { message.error('加载会话失败，请检查网络') }
  }

  const deleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await api.delete(`/sessions/${sid}`)
    setSessions(s => s.filter(x => x.session_id !== sid))
    if (sessionId === sid) startNewSession()
  }

  // 粒子背景
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.2 + 0.3,
    }))
    let raf: number, t = 0
    const draw = () => {
      t++
      ctx.clearRect(0, 0, w, h)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${0.3 + Math.sin(t * 0.02 + p.x) * 0.1})`
        ctx.fill()
      })
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 90) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(99,102,241,${0.06 * (1 - d / 90)})`
            ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  // 持久化消息和会话
  useEffect(() => {
    localStorage.setItem('chat_msgs', JSON.stringify(msgs.slice(-50)))
  }, [msgs])
  useEffect(() => {
    if (sessionId) localStorage.setItem('session_id', sessionId)
  }, [sessionId])

  const uploadFile = async (file: File) => {
    const isAudio = /\.(mp3|wav|m4a)$/i.test(file.name)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post(isAudio ? '/upload/audio' : '/upload/resume', form)
      setPendingFile({ ...res.data, type: isAudio ? 'audio' : 'resume', file_path: res.data.file_path || '' })
      message.success(`${file.name} 上传成功`)
    } catch { message.error('上传失败，请检查网络') }
    return false
  }

  const send = async (overrideMsg?: string) => {
    const userMsg = overrideMsg || input
    if (!userMsg.trim() && !pendingFile) return
    const finalMsg = userMsg || '请分析上传的文件'
    setMsgs(m => [...m, { role: 'user', content: finalMsg }])
    setInput('')
    setLoading(true)
    setThinkSteps([])
    setActiveAgent('master')

    const body = { session_id: sessionId, message: finalMsg, attachments: pendingFile ? [pendingFile] : [] }
    setPendingFile(null)

    const steps: ThinkStep[] = []

    try {
      const res = await fetch('http://localhost:8001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('请求失败')
      if (!sessionId) setSessionId(res.headers.get('X-Session-Id') || undefined)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let reply = ''
      let report: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') break
          try {
            const obj = JSON.parse(data)
            const step: ThinkStep = { type: obj.type, agent: obj.agent, step: obj.step, message: obj.message, ts: Date.now() }
            steps.push(step)
            setThinkSteps([...steps])
            if (obj.agent) setActiveAgent(obj.agent)
            if (obj.type === 'result') { reply = obj.message || reply; report = obj.report }
          } catch { /* ignore */ }
        }
      }
      setMsgs(m => [...m, { role: 'assistant', content: reply, report, thinking: [...steps] }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: '调用失败，请检查网络' }])
    } finally {
      setLoading(false)
      setActiveAgent(null)
      setThinkSteps([])
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('session_id')
    localStorage.removeItem('chat_msgs')
    window.location.reload()
  }

  const userMenuItems = [
    { key: 'profile', label: '个人中心', icon: <UserOutlined />, onClick: () => nav('/profile') },
    { key: 'settings', label: '账号设置', icon: <SettingOutlined />, onClick: () => nav('/profile') },
    { type: 'divider' as const },
    { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, danger: true, onClick: logout },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--font)', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', opacity: 0.4, zIndex: 0 }} />

      {/* 左侧边栏 */}
      <div style={{ width: 220, background: 'var(--bg-2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>章鱼面试助手</div>
            <Tooltip title="新建会话">
              <Button size="small" type="text" icon={<span style={{ fontSize: 16, color: 'var(--primary)' }}>+</span>}
                onClick={startNewSession} style={{ color: 'var(--primary)' }} />
            </Tooltip>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>多 Agent 协同系统</div>
        </div>

        <div style={{ padding: '12px 16px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>AGENT 架构</div>

        {AGENTS.map(a => (
          <Tooltip key={a.key} title={a.desc} placement="right">
          <div
            style={{
              padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'default',
              background: activeAgent === a.key ? `${a.color}18` : 'transparent',
              borderLeft: activeAgent === a.key ? `3px solid ${a.color}` : '3px solid transparent',
              transition: 'all 0.2s',
              marginLeft: a.key !== 'master' ? 12 : 0,
            }}>
            <span style={{ color: activeAgent === a.key ? a.color : 'var(--text-muted)', fontSize: 14, transition: 'color 0.2s' }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: activeAgent === a.key ? 'var(--text)' : 'var(--text-dim)', fontWeight: activeAgent === a.key ? 600 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                {a.name}
                {activeAgent === a.key && <Badge status="processing" />}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.desc}</div>
            </div>
            {activeAgent === a.key && (
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, boxShadow: `0 0 6px ${a.color}`, animation: 'pulse-ring 1s infinite' }} />
            )}
          </div>
          </Tooltip>
        ))}

        <div style={{ flex: 1 }} />
        {/* 导航条状模块 */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: '个人中心', path: '/profile', icon: <UserOutlined />, color: '#6366F1' },
            { label: '知识库管理', path: '/knowledge', icon: <BookOutlined />, color: '#10B981' },
            { label: '面试模拟', path: '/interview-sim', icon: <PlayCircleOutlined />, color: '#F59E0B' },
            { label: '后台管理', path: '/admin', icon: <TeamOutlined />, color: '#EF4444' },
          ].map(item => (
            <div key={item.path} onClick={() => nav(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.borderColor = item.color + '60' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
              <span style={{ color: item.color, fontSize: 13 }}>{item.icon}</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 中间对话区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 顶部栏 */}
        <div style={{ padding: '10px 20px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <OctopusIcon size={18} color="var(--primary)" />
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>对话</span>
          {activeAgent && <Tag color="processing" icon={<Badge status="processing" />}>
            {AGENTS.find(a => a.key === activeAgent)?.name || activeAgent} 处理中...
          </Tag>}
          <div style={{ flex: 1 }} />
          {/* 用户头像 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                <UserOutlined style={{ color: '#fff' }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-dim)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username || '用户'}
              </span>
            </div>
          </Dropdown>
        </div>

        {/* 消息列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', position: 'relative' }}>
          {/* 消息内容 */}
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16, animation: 'fadeIn 0.3s ease' }}>
              {m.role === 'assistant' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 }}>
                  <OctopusIcon size={14} color="#fff" />
                </div>
              )}
              <div style={{ maxWidth: '70%' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: m.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                  background: m.role === 'user' ? 'var(--gradient)' : 'var(--bg-card)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 14, lineHeight: 1.6,
                }}>
                  {m.role === 'assistant'
                    ? <ReactMarkdown>{m.content}</ReactMarkdown>
                    : m.content}

                  {/* 报告卡片 */}
                  {m.report?.score !== undefined && (
                    <div style={{ marginTop: 10, padding: 12, background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>综合评分</span>
                        <Progress type="circle" percent={m.report.score} size={48} strokeColor={m.report.score >= 80 ? '#10B981' : m.report.score >= 60 ? '#F59E0B' : '#EF4444'} trailColor="var(--border)" />
                      </div>
                      {m.report.completeness?.missing?.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>缺失项：{m.report.completeness.missing.join('、')}</div>
                      )}
                      {m.report.ai_suggestions?.map((s: string, j: number) => (
                        <div key={j} style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>• {s}</div>
                      ))}
                      {m.report.report_id && <Tag color="green" style={{ marginTop: 8 }}>报告 #{m.report.report_id}</Tag>}
                    </div>
                  )}

                  {/* 面试题卡片 */}
                  {m.report?.questions?.length > 0 && !m.report.score && (
                    <div style={{ marginTop: 10 }}>
                      {m.report.questions.map((q: any, j: number) => (
                        <div key={j} style={{ padding: '8px 10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
                          <Tag color={q.difficulty === 'hard' ? 'red' : q.difficulty === 'medium' ? 'orange' : 'green'} style={{ fontSize: 11 }}>{q.difficulty}</Tag>
                          <Tag color="purple" style={{ fontSize: 11 }}>{q.type}</Tag>
                          <div style={{ marginTop: 4, color: 'var(--text)' }}>{q.question}</div>
                          {q.key_points?.length > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>要点：{q.key_points.join(' · ')}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 思考过程折叠 */}
                {m.thinking && m.thinking.length > 0 && (
                  <Collapse ghost size="small" style={{ marginTop: 4 }} items={[{
                    key: '1',
                    label: <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>查看思考过程 ({m.thinking.length} 步)</span>,
                    children: (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {m.thinking.map((s, j) => (
                          <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
                            <Tag color={s.type === 'routing' ? 'blue' : s.type === 'progress' ? 'orange' : s.type === 'error' ? 'red' : 'green'} style={{ fontSize: 10, margin: 0, flexShrink: 0 }}>
                              {s.type}
                            </Tag>
                            <span>{s.message}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }]} />
                )}
              </div>
              {m.role === 'user' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8, flexShrink: 0 }}>
                  <UserOutlined style={{ color: 'var(--primary)', fontSize: 14 }} />
                </div>
              )}
            </div>
          ))}

          {/* 实时思考流 */}
          {loading && thinkSteps.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 }}>
                <OctopusIcon size={14} color="#fff" />
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '2px 12px 12px 12px', padding: '10px 14px', maxWidth: '70%' }}>
                {thinkSteps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, fontSize: 12, alignItems: 'center' }}>
                    <Tag color={s.type === 'routing' ? 'blue' : s.type === 'progress' ? 'orange' : 'green'} style={{ fontSize: 10, margin: 0 }}>{s.type}</Tag>
                    <span style={{ color: 'var(--text-dim)' }}>{s.message}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {loading && thinkSteps.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <OctopusIcon size={14} color="#fff" />
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '2px 12px 12px 12px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 快捷功能 */}
        {msgs.length <= 1 && (
          <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap', background: 'var(--bg)' }}>
            {SHORTCUTS.map(s => (
              <Tooltip key={s.label} title={s.hint}>
                <Button size="small" icon={s.icon} onClick={() => { setInput(s.label); }}
                  style={{ borderRadius: 16, fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                  {s.label}
                </Button>
              </Tooltip>
            ))}
          </div>
        )}

        {/* 文件预览 */}
        {pendingFile && (
          <div style={{ margin: '0 20px 8px', padding: '6px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)' }}>
            <span>{pendingFile.type === 'audio' ? <AudioOutlined /> : <FileTextOutlined />} 已附加 {pendingFile.type === 'audio' ? '录音' : '简历'} 文件</span>
            <Button size="small" type="link" danger onClick={() => setPendingFile(null)}>移除</Button>
          </div>
        )}

        {/* 输入框 */}
        <div style={{ padding: '12px 20px', background: 'var(--bg-2)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <Upload beforeUpload={uploadFile} showUploadList={false} accept=".pdf,.docx,.doc,.txt,.md,.mp3,.wav,.m4a">
            <Tooltip title="上传简历(PDF/Word/TXT/MD)或录音(mp3/wav/m4a)">
              <Button icon={<PaperClipOutlined />} style={{ borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-dim)' }} />
            </Tooltip>
          </Upload>
          <Input
            value={input} onChange={e => setInput(e.target.value)}
            onPressEnter={() => send()} placeholder="输入消息，或上传简历/录音文件..."
            disabled={loading} style={{ borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={() => send()} loading={loading} style={{ borderRadius: 8 }} />
        </div>
      </div>

      {/* 右侧面板 */}
      <div style={{ width: 260, background: 'var(--bg-2)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        <div style={{ padding: '12px 12px 0' }}>
        {activeAgent ? (
          <div style={{ padding: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, marginBottom: 10 }}>
            {(() => { const a = AGENTS.find(x => x.key === activeAgent); return a ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: a.color, fontSize: 14 }}>{a.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{a.name}</span>
                  <Badge status="processing" />
                </div>
                <Progress percent={thinkSteps.length * 20 > 100 ? 100 : thinkSteps.length * 20} size="small" showInfo={false} strokeColor={a.color} trailColor="var(--border)" />
              </div>
            ) : null })()}
          </div>
        ) : (
          <div style={{ padding: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            等待任务...
          </div>
        )}

        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13, color: 'var(--text)' }}>快捷功能</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {SHORTCUTS.map(s => (
            <Button key={s.label} icon={s.icon} size="small"
              style={{ textAlign: 'left', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
              onClick={() => setInput(s.label)}>
              {s.label}
            </Button>
          ))}
        </div>

        {recentReports.length > 0 && (
          <>
            <div style={{ fontWeight: 600, margin: '12px 0 6px', fontSize: 13, color: 'var(--text)' }}>历史报告</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recentReports.slice(0, 5).map((r: any) => (
                <div key={r.id} onClick={() => nav(`/report/${r.id}`)}
                  style={{ padding: '6px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-active)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <span style={{ color: 'var(--text-dim)' }}><FileSearchOutlined style={{ marginRight: 4 }} />{r.report_type}</span>
                  <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>{r.score}分</Tag>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 新建会话 — 与左下角导航模块风格一致 */}
        <div style={{ margin: '12px 0 0' }}>
          <div onClick={startNewSession}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.borderColor = '#6366F160' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
            <PlusOutlined style={{ color: '#6366F1', fontSize: 13 }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>新建会话</span>
          </div>
        </div>

        {/* 历史会话 */}
        {sessions.length > 0 && (
          <>
            <div style={{ fontWeight: 600, margin: '12px 0 6px', fontSize: 13, color: 'var(--text)' }}>历史会话</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sessions.slice(0, 10).map((s: any) => (
                <div key={s.session_id}
                  onClick={() => switchSession(s.session_id)}
                  style={{
                    padding: '6px 8px', background: sessionId === s.session_id ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)',
                    border: `1px solid ${sessionId === s.session_id ? 'var(--border-active)' : 'var(--border)'}`,
                    borderRadius: 6, cursor: 'pointer', fontSize: 11, transition: 'all 0.2s',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4
                  }}
                  onMouseEnter={e => { if (sessionId !== s.session_id) e.currentTarget.style.borderColor = 'var(--border-active)' }}
                  onMouseLeave={e => { if (sessionId !== s.session_id) e.currentTarget.style.borderColor = 'var(--border)' }}>
                  <span style={{ color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </span>
                  <span onClick={(e) => deleteSession(s.session_id, e)}
                    style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0, padding: '0 2px' }}>✕</span>
                </div>
              ))}
            </div>
          </>
        )}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
