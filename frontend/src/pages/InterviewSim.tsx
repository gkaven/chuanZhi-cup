import { useState, useRef, useEffect } from 'react'
import { Button, Input, Tag, Progress, Spin } from 'antd'
import { SendOutlined, UserOutlined, ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import { OctopusIcon } from '../components/OctopusIcon'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import api from '../services/api'

interface QA { question: string; answer: string; score?: number; suggestion?: string }

const SAMPLE_QUESTIONS = [
  '请介绍一下你自己',
  '你的最大优点和缺点是什么？',
  '你为什么想加入我们公司？',
  '描述一次你解决困难问题的经历',
  '你的职业规划是什么？',
]

export default function InterviewSim() {
  const [phase, setPhase] = useState<'ready' | 'interviewing' | 'result'>('ready')
  const [position, setPosition] = useState('')
  const [messages, setMessages] = useState<{ role: 'interviewer' | 'user'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<QA[]>([])
  const [evaluating, setEvaluating] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const nav = useNavigate()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const start = () => {
    if (!position.trim()) return
    setPhase('interviewing')
    setQIndex(0)
    setAnswers([])
    setMessages([
      { role: 'interviewer', text: `你好！我是今天的面试官，本次面试岗位是【${position}】。请放松，我们开始吧。` },
      { role: 'interviewer', text: SAMPLE_QUESTIONS[0] },
    ])
  }

  const send = async () => {
    if (!input.trim() || loading) return
    const userText = input
    setInput('')
    const currentQ = SAMPLE_QUESTIONS[qIndex]
    setMessages(m => [...m, { role: 'user', text: userText }])
    setLoading(true)

    // 评估当前回答
    try {
      const res = await api.post('/chat', {
        message: `请评估以下面试回答（1-100分），只输出JSON：{"score":85,"suggestion":"建议..."}
问题：${currentQ}
回答：${userText}`,
        attachments: []
      })
      // 简单解析
      let score = 75, suggestion = '回答较好，可以更具体'
      try {
        const text = res.data?.message || ''
        const match = text.match(/\{[^}]+\}/)
        if (match) { const obj = JSON.parse(match[0]); score = obj.score; suggestion = obj.suggestion }
      } catch { /* ignore */ }
      setAnswers(a => [...a, { question: currentQ, answer: userText, score, suggestion }])
    } catch { setAnswers(a => [...a, { question: currentQ, answer: userText, score: 70, suggestion: '评估失败' }]) }

    const next = qIndex + 1
    setQIndex(next)
    if (next < SAMPLE_QUESTIONS.length) {
      setTimeout(() => {
        setMessages(m => [...m, { role: 'interviewer', text: SAMPLE_QUESTIONS[next] }])
        setLoading(false)
      }, 800)
    } else {
      setTimeout(() => {
        setMessages(m => [...m, { role: 'interviewer', text: '感谢你的参与！面试结束，正在生成评估报告...' }])
        setLoading(false)
        setEvaluating(true)
        setTimeout(() => { setEvaluating(false); setPhase('result') }, 1500)
      }, 800)
    }
  }

  const avgScore = answers.length ? Math.round(answers.reduce((s, a) => s + (a.score || 0), 0) / answers.length) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-2)' }}>
        <Button icon={<ArrowLeftOutlined />} type="text" style={{ color: 'var(--text-dim)' }} onClick={() => nav('/')} />
        <OctopusIcon size={18} color="var(--primary)" />
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>面试模拟</span>
        {phase === 'interviewing' && (
          <Tag color="processing" style={{ marginLeft: 8 }}>
            {qIndex}/{SAMPLE_QUESTIONS.length} 题
          </Tag>
        )}
        <div style={{ flex: 1 }} />
        {phase !== 'ready' && <Button icon={<ReloadOutlined />} type="text" style={{ color: 'var(--text-dim)' }} onClick={() => setPhase('ready')}>重新开始</Button>}
      </div>

      {/* Ready */}
      {phase === 'ready' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 440, padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>模拟面试</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>AI 面试官将提问 {SAMPLE_QUESTIONS.length} 道题，实时评估你的回答</div>
            <Input value={position} onChange={e => setPosition(e.target.value)}
              placeholder="输入目标岗位（如：前端开发工程师）"
              style={{ marginBottom: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, height: 44 }}
              onPressEnter={start} />
            <Button type="primary" block size="large" onClick={start} disabled={!position.trim()} style={{ borderRadius: 8, height: 44 }}>
              开始面试
            </Button>
          </div>
        </div>
      )}

      {/* Interviewing */}
      {phase === 'interviewing' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <Progress percent={Math.round(qIndex / SAMPLE_QUESTIONS.length * 100)} showInfo={false}
              strokeColor="var(--primary)" trailColor="var(--border)" style={{ marginBottom: 20 }} />
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16, animation: 'fadeIn 0.3s ease' }}>
                {m.role === 'interviewer' && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>
                    <OctopusIcon size={14} color="#fff" />
                  </div>
                )}
                <div style={{
                  maxWidth: '70%', padding: '10px 14px', borderRadius: m.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                  background: m.role === 'user' ? 'var(--gradient)' : 'var(--bg-card)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 14, lineHeight: 1.6,
                }}>
                  {m.text}
                </div>
                {m.role === 'user' && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 10, flexShrink: 0 }}>
                    <UserOutlined style={{ color: 'var(--primary)', fontSize: 14 }} />
                  </div>
                )}
              </div>
            ))}
            {(loading || evaluating) && (
              <div style={{ display: 'flex', gap: 6, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '2px 12px 12px 12px', width: 'fit-content' }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', gap: 8 }}>
            <Input value={input} onChange={e => setInput(e.target.value)} onPressEnter={send}
              placeholder="输入你的回答..." disabled={loading || evaluating}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8 }} />
            <Button type="primary" icon={<SendOutlined />} onClick={send} loading={loading} style={{ borderRadius: 8 }} />
          </div>
        </>
      )}

      {/* Result */}
      {phase === 'result' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Progress type="circle" percent={avgScore} size={100} strokeColor={avgScore >= 80 ? '#10B981' : avgScore >= 60 ? '#F59E0B' : '#EF4444'} trailColor="var(--border)"
                format={p => <span style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700 }}>{p}</span>} />
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 12 }}>面试综合评分</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>岗位：{position}</div>
            </div>
            {answers.map((a, i) => (
              <div key={i} style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Q{i + 1}: {a.question}</span>
                  <Tag color={a.score! >= 80 ? 'success' : a.score! >= 60 ? 'warning' : 'error'}>{a.score}分</Tag>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  你的回答：{a.answer}
                </div>
                {a.suggestion && <div style={{ fontSize: 12, color: 'var(--primary)' }}>💡 {a.suggestion}</div>}
              </div>
            ))}
            <Button type="primary" block size="large" onClick={() => setPhase('ready')} style={{ borderRadius: 8, marginTop: 8 }}>再来一次</Button>
          </div>
        </div>
      )}
    </div>
  )
}
