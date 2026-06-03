import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, List, Tag, Button } from 'antd';
import { FileTextOutlined, TeamOutlined, AuditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trialsApi } from '../api/trials';
import { casesApi } from '../api/cases';
import { TrialSession, TrialStatus } from '../types/trial';
import { CaseListItem } from '../types/case';
import { UserRole } from '../types/user';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trials, setTrials] = useState<TrialSession[]>([]);
  const [cases, setCases] = useState<CaseListItem[]>([]);

  useEffect(() => {
    trialsApi.list().then((res) => setTrials(res.data));
    casesApi.list().then((res) => setCases(res.data));
  }, []);

  const activeTrials = trials.filter((t) => t.status === TrialStatus.IN_PROGRESS);
  const statusColor: Record<string, string> = {
    pending: 'default',
    in_progress: 'processing',
    completed: 'success',
    cancelled: 'error',
  };
  const statusText: Record<string, string> = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };

  return (
    <div>
      <Typography.Title level={4}>
        欢迎，{user?.full_name}
        <Tag className="ml-2" color="blue">
          {user?.role === UserRole.TEACHER ? '教师' : user?.role === UserRole.JUDGE ? '法官' : '学生'}
        </Tag>
      </Typography.Title>

      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card><Statistic title="案件总数" value={cases.length} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="庭审总数" value={trials.length} prefix={<AuditOutlined />} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="进行中" value={activeTrials.length} prefix={<TeamOutlined />} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
      </Row>

      <Card
        title="最近庭审"
        extra={user?.role === UserRole.TEACHER && <Button type="primary" onClick={() => navigate('/trials')}>创建庭审</Button>}
      >
        <List
          dataSource={trials.slice(0, 5)}
          renderItem={(trial) => (
            <List.Item
              actions={[<Button type="link" onClick={() => navigate(`/trials/${trial.id}`)}>查看</Button>]}
            >
              <List.Item.Meta
                title={trial.title}
                description={`创建时间: ${new Date(trial.created_at).toLocaleString()}`}
              />
              <Tag color={statusColor[trial.status]}>{statusText[trial.status]}</Tag>
            </List.Item>
          )}
          locale={{ emptyText: '暂无庭审' }}
        />
      </Card>
    </div>
  );
}
