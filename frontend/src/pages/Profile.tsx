import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Tag, Button, Empty, Spin } from 'antd'
import { FileTextOutlined, AudioOutlined, BulbOutlined, UserOutlined, LogoutOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const TYPE_ICON: Record<string, any> = {
  resume_eval: <FileTextOutlined style={{ color: '#10B981' }} />,
  audio_analysis: <AudioOutlined style={{ color: '#F59E0B' }} />,
  question_gen: <BulbOutlined style={{ color: '#8B5CF6' }} />,
}
const TYPE_LABEL: Record<string, string> = {
  resume_eval: '简历评估', audio_analysis: '录音分析', question_gen: '面试题生成',
}

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    Promise.all([api.get('/auth/me'), api.get('/reports')])
      .then(([u, r]) => { setUser(u.data); setReports(r.data) })
      .finally(() => setLoading(false))
  }, [])

  const logout = () => { localStorage.removeItem('token'); window.location.href = '/' }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}><Spin size="large" /></div>

  const avgScore = reports.length ? Math.round(reports.reduce((s, r) => s + (r.score || 0), 0) / reports.length) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <Button icon={<ArrowLeftOutlined />} type="text" style={{ color: 'var(--text-dim)' }} onClick={() => nav('/')} />
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>个人中心</span>
        </div>

        {/* 用户信息卡 */}
        <div style={{ padding: 28, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
            <UserOutlined style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{user?.username}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{user?.email}</div>
            <Tag color={user?.role === 'admin' ? 'purple' : 'blue'} style={{ marginTop: 8 }}>{user?.role}</Tag>
          </div>
          <Button icon={<LogoutOutlined />} danger type="text" onClick={logout}>退出登录</Button>
        </div>

        {/* 统计 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {[
            { title: '总报告数', value: reports.length, color: 'var(--primary)' },
            { title: '平均评分', value: avgScore, suffix: '分', color: avgScore >= 80 ? '#10B981' : avgScore >= 60 ? '#F59E0B' : '#EF4444' },
            { title: '简历评估', value: reports.filter(r => r.report_type === 'resume_eval').length, color: '#10B981' },
            { title: '录音分析', value: reports.filter(r => r.report_type === 'audio_analysis').length, color: '#F59E0B' },
          ].map(s => (
            <Col span={6} key={s.title}>
              <div style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}{s.suffix}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.title}</div>
              </div>
            </Col>
          ))}
        </Row>

        {/* 历史报告 */}
        <div style={{ padding: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>历史报告</div>
          {reports.length === 0 ? <Empty description={<span style={{ color: 'var(--text-muted)' }}>暂无报告</span>} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reports.map((r: any) => (
                <div key={r.id} onClick={() => nav(`/report/${r.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-active)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                  <span style={{ fontSize: 18 }}>{TYPE_ICON[r.report_type] || <FileTextOutlined />}</span>
                  <span style={{ flex: 1, color: 'var(--text)', fontSize: 14 }}>{TYPE_LABEL[r.report_type] || r.report_type}</span>
                  <Tag color={r.score >= 80 ? 'success' : r.score >= 60 ? 'warning' : 'error'}>{r.score}分</Tag>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
