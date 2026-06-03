import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Card, InputNumber, message, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { trialsApi } from '../../api/trials';
import { casesApi } from '../../api/cases';
import { CaseListItem } from '../../types/case';
import { User } from '../../types/user';
import api from '../../api/axios';

export default function TrialSetup() {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [judges, setJudges] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    casesApi.list().then((res) => setCases(res.data));
    api.get('/users?role=judge').then((res) => setJudges(res.data));
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const phaseConfigs = [
        { phase: 'opening', duration_seconds: values.opening_duration || 300, weight: values.opening_weight || 1.0 },
        { phase: 'evidence', duration_seconds: values.evidence_duration || 600, weight: values.evidence_weight || 1.0 },
        { phase: 'cross_examination', duration_seconds: values.cross_duration || 600, weight: values.cross_weight || 1.0 },
        { phase: 'closing', duration_seconds: values.closing_duration || 300, weight: values.closing_weight || 1.0 },
        { phase: 'verdict', duration_seconds: values.verdict_duration || 120, weight: values.verdict_weight || 1.0 },
      ];

      const res = await trialsApi.create({
        case_id: values.case_id,
        title: values.title,
        judge_id: values.judge_id,
        phase_configs: phaseConfigs,
      });

      message.success('庭审创建成功，请在详情页点击"抽签分组"');
      navigate(`/trials/${res.data.id}`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Typography.Title level={4}>创建庭审</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} className="max-w-[800px]">
          <Form.Item name="title" label="庭审标题" rules={[{ required: true }]}>
            <Input placeholder="如：张三诉李四合同纠纷案模拟庭审" />
          </Form.Item>
          <Form.Item name="case_id" label="选择案件" rules={[{ required: true }]}>
            <Select placeholder="请选择案件">
              {cases.map((c) => <Select.Option key={c.id} value={c.id}>{c.title}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="judge_id" label="指定法官">
            <Select placeholder="请选择法官" allowClear>
              {judges.map((j) => <Select.Option key={j.id} value={j.id}>{j.full_name}</Select.Option>)}
            </Select>
          </Form.Item>

          <Typography.Title level={5}>阶段时长设置（秒）</Typography.Title>
          <Space wrap>
            <Form.Item name="opening_duration" label="开庭陈述" initialValue={300}>
              <InputNumber min={60} max={3600} />
            </Form.Item>
            <Form.Item name="evidence_duration" label="举证质证" initialValue={600}>
              <InputNumber min={60} max={3600} />
            </Form.Item>
            <Form.Item name="cross_duration" label="辩论交锋" initialValue={600}>
              <InputNumber min={60} max={3600} />
            </Form.Item>
            <Form.Item name="closing_duration" label="最后陈述" initialValue={300}>
              <InputNumber min={60} max={3600} />
            </Form.Item>
            <Form.Item name="verdict_duration" label="评议宣判" initialValue={120}>
              <InputNumber min={60} max={3600} />
            </Form.Item>
          </Space>

          <Typography.Title level={5}>阶段评分权重</Typography.Title>
          <Space wrap>
            <Form.Item name="opening_weight" label="开庭陈述" initialValue={1.0}>
              <InputNumber min={0.1} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="evidence_weight" label="举证质证" initialValue={1.0}>
              <InputNumber min={0.1} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="cross_weight" label="辩论交锋" initialValue={1.0}>
              <InputNumber min={0.1} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="closing_weight" label="最后陈述" initialValue={1.0}>
              <InputNumber min={0.1} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="verdict_weight" label="评议宣判" initialValue={1.0}>
              <InputNumber min={0.1} max={10} step={0.1} />
            </Form.Item>
          </Space>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>创建庭审</Button>
            <Button className="ml-2" onClick={() => navigate('/trials')}>取消</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
