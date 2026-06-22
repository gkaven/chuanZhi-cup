import { useEffect, useState } from 'react'
import { Tabs, Table, Button, Form, Input, Select, Popconfirm, Statistic, Row, Col, message, Tag } from 'antd'
import api from '../services/api'

export default function Admin() {
  const [questions, setQuestions] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [form] = Form.useForm()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [q, u, a] = await Promise.all([
      api.get('/admin/questions'),
      api.get('/admin/users'),
      api.get('/admin/analytics'),
    ])
    setQuestions(q.data.items)
    setUsers(u.data.items)
    setAnalytics(a.data)
  }

  const addQuestion = async (values: any) => {
    await api.post('/admin/questions', values)
    message.success('添加成功')
    form.resetFields()
    const res = await api.get('/admin/questions')
    setQuestions(res.data.items)
  }

  const deleteQuestion = async (id: number) => {
    await api.delete(`/admin/questions/${id}`)
    setQuestions(q => q.filter(x => x.id !== id))
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>后台管理</h2>
      <Tabs items={[
        {
          key: 'analytics', label: '数据面板',
          children: analytics && (
            <Row gutter={24}>
              <Col span={6}><Statistic title="总用户数" value={analytics.total_users} /></Col>
              <Col span={6}><Statistic title="总报告数" value={analytics.total_reports} /></Col>
              <Col span={6}><Statistic title="题库总量" value={analytics.total_questions} /></Col>
              <Col span={6}><Statistic title="平均评分" value={analytics.avg_score} suffix="分" /></Col>
            </Row>
          )
        },
        {
          key: 'questions', label: '题库管理',
          children: (
            <>
              <Form form={form} layout="inline" onFinish={addQuestion} style={{ marginBottom: 16 }}>
                <Form.Item name="question_text" rules={[{ required: true }]}>
                  <Input placeholder="题目内容" style={{ width: 300 }} />
                </Form.Item>
                <Form.Item name="answer_text">
                  <Input placeholder="参考答案" style={{ width: 200 }} />
                </Form.Item>
                <Form.Item name="category">
                  <Input placeholder="分类" style={{ width: 100 }} />
                </Form.Item>
                <Form.Item name="difficulty" initialValue="medium">
                  <Select style={{ width: 90 }} options={[
                    { value: 'easy', label: '简单' },
                    { value: 'medium', label: '中等' },
                    { value: 'hard', label: '困难' },
                  ]} />
                </Form.Item>
                <Button type="primary" htmlType="submit">添加</Button>
              </Form>
              <Table dataSource={questions} rowKey="id" size="small" columns={[
                { title: 'ID', dataIndex: 'id', width: 60 },
                { title: '题目', dataIndex: 'question_text', ellipsis: true },
                { title: '分类', dataIndex: 'category', width: 80 },
                { title: '难度', dataIndex: 'difficulty', width: 80 },
                { title: '来源', dataIndex: 'source', width: 100 },
                {
                  title: '操作', width: 80,
                  render: (_, r) => (
                    <Popconfirm title="确认删除？" onConfirm={() => deleteQuestion(r.id)}>
                      <Button size="small" danger>删除</Button>
                    </Popconfirm>
                  )
                }
              ]} />
            </>
          )
        },
        {
          key: 'users', label: '用户管理',
          children: (
            <Table dataSource={users} rowKey="id" size="small" columns={[
              { title: 'ID', dataIndex: 'id', width: 60 },
              { title: '用户名', dataIndex: 'username' },
              { title: '邮箱', dataIndex: 'email' },
              { title: '角色', dataIndex: 'role', width: 80, render: (role: string) => <Tag color={role === 'admin' ? 'purple' : 'blue'}>{role}</Tag> },
              { title: '注册时间', dataIndex: 'created_at' },
              {
                title: '操作', width: 120,
                render: (_, r) => (
                  <Select size="small" value={r.role} style={{ width: 90 }}
                    onChange={async (val) => {
                      await api.patch(`/admin/users/${r.id}`, { role: val })
                      message.success('角色已更新')
                      const res = await api.get('/admin/users')
                      setUsers(res.data.items)
                    }}
                    options={[{ value: 'user', label: '普通用户' }, { value: 'admin', label: '管理员' }]}
                  />
                )
              }
            ]} />
          )
        },
      ]} />
    </div>
  )
}
