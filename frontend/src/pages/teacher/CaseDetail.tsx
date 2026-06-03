import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Upload, List, message, Typography, Divider } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { casesApi } from '../../api/cases';
import { Case } from '../../types/case';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      casesApi.get(id).then((res) => setCaseData(res.data));
    }
  }, [id]);

  const handleUpload = async (file: File) => {
    if (!id) return;
    try {
      await casesApi.uploadAttachment(id, file);
      message.success('上传成功');
      casesApi.get(id).then((res) => setCaseData(res.data));
    } catch {
      message.error('上传失败');
    }
  };

  if (!caseData) return null;

  const difficultyMap: Record<string, string> = { basic: '基础', intermediate: '中等', advanced: '高级' };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={4} className="mb-0">{caseData.title}</Typography.Title>
        <Button onClick={() => navigate('/cases')}>返回列表</Button>
      </div>

      <Card>
        <Descriptions column={2}>
          <Descriptions.Item label="难度等级">
            <Tag>{difficultyMap[caseData.difficulty_level]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{new Date(caseData.created_at).toLocaleString()}</Descriptions.Item>
        </Descriptions>

        <Divider />
        <Typography.Title level={5}>案件描述</Typography.Title>
        <Typography.Paragraph>{caseData.description}</Typography.Paragraph>

        <Divider />
        <Typography.Title level={5}>背景事实</Typography.Title>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{caseData.background_facts}</Typography.Paragraph>

        <Divider />
        <Typography.Title level={5}>相关法律条文</Typography.Title>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{caseData.relevant_laws}</Typography.Paragraph>

        <Divider />
        <div className="flex justify-between items-center">
          <Typography.Title level={5} className="mb-0">附件材料</Typography.Title>
          {user?.role === UserRole.TEACHER && (
            <Upload
              beforeUpload={(file) => { handleUpload(file); return false; }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>上传附件</Button>
            </Upload>
          )}
        </div>
        <List
          className="mt-2"
          dataSource={caseData.attachments}
          renderItem={(att) => (
            <List.Item>
              <span>{att.file_name}</span>
              <Tag>{(att.file_size / 1024).toFixed(1)} KB</Tag>
            </List.Item>
          )}
          locale={{ emptyText: '暂无附件' }}
        />
      </Card>
    </div>
  );
}
