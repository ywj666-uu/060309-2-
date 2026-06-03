import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { casesApi } from '../../api/cases';
import { CaseListItem, DifficultyLevel } from '../../types/case';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';

export default function CaseList() {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    casesApi.list().then((res) => { setCases(res.data); setLoading(false); });
  }, []);

  const difficultyMap: Record<string, { color: string; text: string }> = {
    basic: { color: 'green', text: '基础' },
    intermediate: { color: 'orange', text: '中等' },
    advanced: { color: 'red', text: '高级' },
  };

  const columns = [
    { title: '案件名称', dataIndex: 'title', key: 'title' },
    {
      title: '难度', dataIndex: 'difficulty_level', key: 'difficulty_level',
      render: (level: string) => <Tag color={difficultyMap[level]?.color}>{difficultyMap[level]?.text}</Tag>,
    },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at',
      render: (t: string) => new Date(t).toLocaleDateString(),
    },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: CaseListItem) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/cases/${record.id}`)}>查看</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={4} className="mb-0">案件列表</Typography.Title>
        {user?.role === UserRole.TEACHER && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/cases/create')}>
            创建案件
          </Button>
        )}
      </div>
      <Table dataSource={cases} columns={columns} rowKey="id" loading={loading} />
    </div>
  );
}
