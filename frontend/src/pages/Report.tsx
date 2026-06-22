import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Progress, Tag, Button, Spin, Card, Row, Col, Timeline } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined, AudioOutlined, BulbOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import api from '../services/api'

const TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  resume_eval:    { label: '简历评估', icon: <FileTextOutlined />, color: '#52c41a' },
  audio_analysis: { label: '录音分析', icon: <AudioOutlined />,   color: '#fa8c16' },
  question_gen:   { label: '面试题生成', icon: <BulbOutlined />,  color: '#722ed1' },
}

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/report/${id}`).then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}><Spin size="large" /></div>
  if (!data) return <div style={{ textAlign: 'center', marginTop: 80, color: '#999' }}>报告不存在</div>

  const rj = data.report_json || {}
  const meta = TYPE_MAP[data.report_type] || { label: data.report_type, icon: null, color: '#1677ff' }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => nav(-1)} style={{ marginBottom: 16 }}>返回</Button>

      {/* 头部 */}
      <Card style={{ marginBottom: 20, borderRadius: 12 }}>
        <Row align="middle" gutter={24}>
          <Col>
            <div style={{ fontSize: 40, color: meta.color }}>{meta.icon}</div>
          </Col>
          <Col flex={1}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{meta.label}报告</div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              报告 #{data.id} · {new Date(data.created_at).toLocaleString()}
            </div>
          </Col>
          {data.score != null && (
            <Col>
              <Progress type="circle" percent={data.score} size={80}
                strokeColor={data.score >= 80 ? '#52c41a' : data.score >= 60 ? '#faad14' : '#ff4d4f'}
                format={p => <span style={{ fontSize: 18, fontWeight: 700, color: p >= 80 ? '#10B981' : p >= 60 ? '#F59E0B' : '#EF4444' }}>{p}</span>} />
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>综合评分</div>
            </Col>
          )}
        </Row>
      </Card>

      {/* 简历评估报告 */}
      {data.report_type === 'resume_eval' && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>{rj.completeness?.score ?? '-'}</div>
                <div style={{ fontSize: 12, color: '#999' }}>完整性评分</div>
                {rj.completeness?.missing?.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    {rj.completeness.missing.map((m: string) => <Tag key={m} color="orange" style={{ fontSize: 11 }}>{m}</Tag>)}
                  </div>
                )}
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: rj.duplicate_check?.is_template ? '#ff4d4f' : '#52c41a' }}>
                  {rj.duplicate_check?.is_template ? '疑似模板' : '原创'}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>查重结果</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  相似度 {((rj.duplicate_check?.similarity || 0) * 100).toFixed(1)}%
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#722ed1' }}>{rj.format?.score ?? '-'}</div>
                <div style={{ fontSize: 12, color: '#999' }}>格式评分</div>
              </Card>
            </Col>
          </Row>

          {rj.ai_suggestions?.length > 0 && (
            <Card title="AI 改进建议" size="small" style={{ borderRadius: 8, marginBottom: 16 }}>
              <Timeline items={rj.ai_suggestions.map((s: string, i: number) => ({ children: s, color: i === 0 ? 'blue' : 'gray' }))} />
            </Card>
          )}
        </>
      )}

      {/* 录音分析报告 */}
      {data.report_type === 'audio_analysis' && (
        <>
          {rj.cached && <Tag color="blue" style={{ marginBottom: 12 }}>此文件已分析过，显示缓存结果</Tag>}
          {rj.summary && (
            <Card size="small" style={{ borderRadius: 8, marginBottom: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>{rj.summary}</div>
            </Card>
          )}
          {(rj.role_transcript || rj.transcript) && (
            <Card title={rj.role_transcript ? "角色分离转写文本" : "原始转写文本"} size="small" style={{ borderRadius: 8, marginBottom: 16 }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-dim)', maxHeight: 200, overflowY: 'auto' }}>
                {rj.role_transcript || rj.transcript}
              </pre>
            </Card>
          )}
          {rj.questions?.map((q: any, i: number) => (
            <Card key={i} size="small" style={{ borderRadius: 8, marginBottom: 12 }}
              title={<span><Tag color={q.accuracy === 'accurate' ? 'green' : q.accuracy === 'partial' ? 'orange' : 'red'}>{q.accuracy}</Tag>第 {i+1} 题</span>}
              extra={<Progress type="circle" percent={q.score} size={36} strokeColor={q.score >= 70 ? '#52c41a' : '#faad14'} trailColor="var(--border)" />}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>Q: {q.question}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 8 }}>A: {q.answer}</div>
              {q.reference && <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>参考要点：{q.reference}</div>}
              {q.suggestion && <div style={{ fontSize: 12, color: 'var(--primary)' }}>建议：{q.suggestion}</div>}
            </Card>
          ))}
          <Row gutter={16} style={{ marginTop: 8 }}>
            {rj.strengths?.map((s: string) => <Col key={s}><Tag color="green">{s}</Tag></Col>)}
            {rj.improvements?.map((s: string) => <Col key={s}><Tag color="orange">{s}</Tag></Col>)}
          </Row>
        </>
      )}

      {/* 面试题报告 */}
      {data.report_type === 'question_gen' && rj.questions?.map((q: any, i: number) => (
        <Card key={i} size="small" style={{ borderRadius: 8, marginBottom: 10 }}
          title={<span><Tag color={q.difficulty === 'hard' ? 'red' : q.difficulty === 'medium' ? 'orange' : 'green'}>{q.difficulty}</Tag><Tag color="blue">{q.type}</Tag>第 {i+1} 题</span>}>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>{q.question}</div>
          {q.key_points?.length > 0 && <div style={{ fontSize: 12, color: '#888' }}>考察要点：{q.key_points.join(' · ')}</div>}
        </Card>
      ))}

      {/* 求职信 / 其他 Markdown 内容 */}
      {!['resume_eval','audio_analysis','question_gen'].includes(data.report_type) && rj && (
        <Card style={{ borderRadius: 8 }}>
          <ReactMarkdown>{typeof rj === 'string' ? rj : JSON.stringify(rj, null, 2)}</ReactMarkdown>
        </Card>
      )}
    </div>
  )
}
