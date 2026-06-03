import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, message, Typography, Space } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { casesApi } from '../../api/cases';

export default function CaseCreate() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        evidence_items: values.evidence_items || [],
      };
      const res = await casesApi.create(payload);
      message.success('案件创建成功');
      navigate(`/cases/${res.data.id}`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Typography.Title level={4}>创建案件卷宗</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} className="max-w-[800px]">
          <Form.Item name="title" label="案件名称" rules={[{ required: true, message: '请输入案件名称' }]}>
            <Input placeholder="如：张三诉李四合同纠纷案" />
          </Form.Item>
          <Form.Item name="description" label="案件描述" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="请输入案件整体描述..." />
          </Form.Item>
          <Form.Item name="background_facts" label="背景事实" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder="请输入案件背景事实..." />
          </Form.Item>
          <Form.Item name="relevant_laws" label="相关法律条文" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder="请输入相关法律条文..." />
          </Form.Item>
          <Form.Item name="difficulty_level" label="难度等级" initialValue="intermediate">
            <Select>
              <Select.Option value="basic">基础</Select.Option>
              <Select.Option value="intermediate">中等</Select.Option>
              <Select.Option value="advanced">高级</Select.Option>
            </Select>
          </Form.Item>

          <Typography.Title level={5}>证据材料预设</Typography.Title>
          <Form.List name="evidence_items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="start" className="flex mb-2">
                    <Form.Item {...restField} name={[name, 'number']} rules={[{ required: true, message: '请输入编号' }]}>
                      <Input placeholder="证据编号 (如：证据1)" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'description']} rules={[{ required: true, message: '请输入描述' }]}>
                      <Input.TextArea placeholder="证据描述（学生端可见）" style={{ width: 400 }} rows={2} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} className="mt-2 text-red-500" />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加证据项
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>创建案件</Button>
            <Button className="ml-2" onClick={() => navigate('/cases')}>取消</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
