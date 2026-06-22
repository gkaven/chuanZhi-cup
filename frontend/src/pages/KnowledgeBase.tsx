import { useEffect, useState } from 'react'
import { Button, Input, Table, Tag, Modal, Form, message, Spin } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function KnowledgeBase() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchVal, setSearchVal] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [testQuery, setTestQuery] = useState('')
  const [testResult, setTestResult] = useState<string[]>([])
  const [testing, setTesting] = useState(false)
  const [form] = Form.useForm()
  const nav = useNavigate()

  const load = () => {
    setLoading(true)
    api.get('/admin/questions').then(r => setItems(r.data.items || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const add = async (vals: any) => {
    await api.post('/admin/questions', vals)
    message.success('添加成功')
    form.resetFields()
    setModalOpen(false)
    load()
  }

  const del = async (id: number) => {
    await api.delete(`/admin/questions/${id}`)
    setItems(i => i.filter(x => x.id !== id))
  }

  const testRag = async () => {
    if (!testQuery.trim()) return
    setTesting(true)
    try {
      const res = await api.post('/rag/search', { query: testQuery })
      setTestResult(res.data.results || [])
    } catch { setTestResult(['RAG 检索接口暂未开放']) }
    finally { setTesting(false) }
  }

  const filtered = items.filter(i => i.question_text?.includes(searchVal))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Button icon={<ArrowLeftOutlined />} type="text" style={{ color: 'var(--text-dim)' }} onClick={() => nav('/')} />
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>知识库管理</span>
          <div style={{ flex: 1 }} />
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setModalOpen(true)}>添加题目</Button>
        </div>

        {/* RAG 检索测试 */}
        <div style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>RAG 检索测试</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input value={testQuery} onChange={e => setTestQuery(e.target.value)}
              placeholder="输入问题，测试向量检索效果..." onPressEnter={testRag}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <Button icon={<SearchOutlined />} onClick={testRag} loading={testing} type="primary">检索</Button>
          </div>
          {testResult.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {testResult.map((r, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderLeft: '3px solid var(--primary)', borderRadius: 4, marginBottom: 6, fontSize: 13, color: 'var(--text-dim)' }}>
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 题库列表 */}
        <div style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>共 {filtered.length} 条</span>
            <Input prefix={<SearchOutlined />} value={searchVal} onChange={e => setSearchVal(e.target.value)}
              placeholder="搜索题目..." style={{ width: 220, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          {loading ? <Spin /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid transparent', transition: 'border 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{item.question_text}</div>
                    {item.answer_text && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.answer_text.slice(0, 80)}...</div>}
                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                      {item.category && <Tag color="blue" style={{ fontSize: 11 }}>{item.category}</Tag>}
                      {item.difficulty && <Tag color={item.difficulty === 'hard' ? 'red' : item.difficulty === 'medium' ? 'orange' : 'green'} style={{ fontSize: 11 }}>{item.difficulty}</Tag>}
                      <Tag style={{ fontSize: 11, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{item.source}</Tag>
                    </div>
                  </div>
                  <Button icon={<DeleteOutlined />} size="small" danger type="text" onClick={() => del(item.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal title={<span style={{ color: 'var(--text)' }}>添加面试题</span>} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}
        styles={{ content: { background: '#0D1526', border: '1px solid var(--border)' }, header: { background: '#0D1526' } }}>
        <Form form={form} layout="vertical" onFinish={add}>
          <Form.Item name="question_text" label={<span style={{ color: 'var(--text-dim)' }}>题目</span>} rules={[{ required: true }]}>
            <Input.TextArea rows={3} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </Form.Item>
          <Form.Item name="answer_text" label={<span style={{ color: 'var(--text-dim)' }}>参考答案</span>}>
            <Input.TextArea rows={3} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="category" label={<span style={{ color: 'var(--text-dim)' }}>分类</span>} style={{ flex: 1 }}>
              <Input style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </Form.Item>
            <Form.Item name="difficulty" label={<span style={{ color: 'var(--text-dim)' }}>难度</span>} initialValue="medium" style={{ flex: 1 }}>
              <Input style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </Form.Item>
          </div>
          <Button type="primary" htmlType="submit" block>添加</Button>
        </Form>
      </Modal>
    </div>
  )
}
