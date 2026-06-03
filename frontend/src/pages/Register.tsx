import React, { useState } from 'react';
import { Form, Input, Button, Card, Select, message, Typography, Space } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await register(values);
      message.success('注册成功');
      navigate('/dashboard');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[450px]" title={<Typography.Title level={3} className="text-center mb-0">注册账号</Typography.Title>}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }, { min: 3, message: '至少3个字符' }]}>
            <Input size="large" placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
            <Input size="large" placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="full_name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input size="large" placeholder="请输入真实姓名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }, { min: 6, message: '至少6个字符' }]}>
            <Input.Password size="large" placeholder="请输入密码" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select size="large" placeholder="请选择角色">
              <Select.Option value="teacher">教师</Select.Option>
              <Select.Option value="student">学生</Select.Option>
              <Select.Option value="judge">法官（评委）</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              注册
            </Button>
          </Form.Item>
          <Space className="w-full justify-center">
            <Typography.Text>已有账号？</Typography.Text>
            <Link to="/login">返回登录</Link>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
