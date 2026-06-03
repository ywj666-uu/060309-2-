import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { trialsApi } from '../../api/trials';
import { TrialSession, TrialStatus } from '../../types/trial';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';

export default function TrialList() {
  const [trials, setTrials] = useState<TrialSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    trialsApi.list().then((res) => { setTrials(res.data); setLoading(false); });
  }, []);

  const statusMap: Record<string, { color: string; text: string }> = {
    pending: { color: 'default', text: '待开始' },
    in_progress: { color: 'processing', text: '进行中' },
    completed: { color: 'success', text: '已完成' },
    cancelled: { color: 'error', text: '已取消' },
  };

  const columns = [
    { title: '庭审标题', dataIndex: 'title', key: 'title' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (status: string) => <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>,
    },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at',
      render: (t: string) => new Date(t).toLocaleDateString(),
    },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: TrialSession) => (
        <Space>
          {user?.role === UserRole.STUDENT && record.status === TrialStatus.IN_PROGRESS && (
            <Button type="link" onClick={() => navigate(`/trials/${record.id}/room`)}>进入庭审</Button>
          )}
          {user?.role === UserRole.JUDGE && record.status === TrialStatus.IN_PROGRESS && (
            <Button type="link" onClick={() => navigate(`/trials/${record.id}/judge`)}>进入评分</Button>
          )}
          <Button type="link" onClick={() => navigate(`/trials/${record.id}`)}>详情</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={4} className="mb-0">庭审列表</Typography.Title>
        {user?.role === UserRole.TEACHER && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trials/create')}>
            创建庭审
          </Button>
        )}
      </div>
      <Table dataSource={trials} columns={columns} rowKey="id" loading={loading} />
    </div>
  );
}
