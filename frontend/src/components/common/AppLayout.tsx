import React from 'react';
import { Layout, Menu, Button, Typography } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  HomeOutlined,
  FileTextOutlined,
  TeamOutlined,
  AuditOutlined,
  BarChartOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/cases', icon: <FileTextOutlined />, label: '案件管理' },
    { key: '/trials', icon: <AuditOutlined />, label: '庭审管理' },
  ];

  if (user?.role === UserRole.TEACHER) {
    menuItems.push({ key: '/students', icon: <TeamOutlined />, label: '学生管理' });
  }

  if (user?.role === UserRole.JUDGE) {
    menuItems.push({ key: '/scoring', icon: <BarChartOutlined />, label: '评分记录' });
  }

  return (
    <Layout className="min-h-screen">
      <Sider theme="dark" breakpoint="lg" collapsedWidth="0">
        <div className="p-4 text-white text-center font-bold text-lg">
          模拟法庭
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="bg-white px-6 flex justify-between items-center shadow-sm">
          <Typography.Text strong>{user?.full_name}</Typography.Text>
          <div className="flex items-center gap-4">
            <Typography.Text type="secondary">
              {user?.role === UserRole.TEACHER ? '教师' : user?.role === UserRole.JUDGE ? '法官' : '学生'}
            </Typography.Text>
            <Button icon={<LogoutOutlined />} onClick={() => { logout(); navigate('/login'); }}>
              退出
            </Button>
          </div>
        </Header>
        <Content className="m-6 p-6 bg-white rounded-lg min-h-[280px]">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
