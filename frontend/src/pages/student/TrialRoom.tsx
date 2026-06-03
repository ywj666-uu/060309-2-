import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, Input, Button, Select, Upload, List, Tag, Space, message, Divider, Steps } from 'antd';
import { UploadOutlined, SendOutlined } from '@ant-design/icons';
import { trialsApi } from '../../api/trials';
import { casesApi } from '../../api/cases';
import { submissionsApi } from '../../api/submissions';
import { TrialSession, TrialStatus, TrialPhase, Group, Submission, SubmissionType } from '../../types/trial';
import { EvidenceItem } from '../../types/case';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTimer } from '../../hooks/useTimer';

const PHASE_LABELS: Record<string, string> = {
  opening: '开庭陈述',
  evidence: '举证质证',
  cross_examination: '辩论交锋',
  closing: '最后陈述',
  verdict: '评议宣判',
};

export default function TrialRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [trial, setTrial] = useState<TrialSession | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subType, setSubType] = useState<string>('argument');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const autoSubmittedRef = useRef(false);

  const { lastMessage, connected } = useWebSocket(id || null);
  const isRunning = trial?.status === TrialStatus.IN_PROGRESS;
  const { remaining, formatTime, syncTime } = useTimer(trial?.phase_duration_seconds || 0, isRunning);

  useEffect(() => {
    if (id) {
      trialsApi.get(id).then((res) => {
        setTrial(res.data);
        casesApi.get(res.data.case_id).then((caseRes) => {
          setEvidenceItems(caseRes.data.evidence_items || []);
        });
      });
      trialsApi.getGroups(id).then((res) => setGroups(res.data));
      submissionsApi.list(id).then((res) => setSubmissions(res.data));
    }
  }, [id]);

  useEffect(() => {
    if (!lastMessage) return;
    const { event, data } = lastMessage;
    if (event === 'phase.time_update') {
      syncTime((data as any).remaining_seconds);
    } else if (event === 'phase.changed' || event === 'trial.started' || event === 'trial.ended') {
      if (id) trialsApi.get(id).then((res) => setTrial(res.data));
      if (id) submissionsApi.list(id).then((res) => setSubmissions(res.data));
      autoSubmittedRef.current = false;
    } else if (event === 'submission.new') {
      if (id) submissionsApi.list(id).then((res) => setSubmissions(res.data));
    } else if (event === 'phase.ended') {
      // Auto-submit partial content when timer reaches zero (non-empty only)
      if (!autoSubmittedRef.current && (title.trim() || content.trim())) {
        autoSubmittedRef.current = true;
        doAutoSubmit();
      }
    }
  }, [lastMessage]);

  const doAutoSubmit = async () => {
    if (!id || !trial?.current_phase) return;
    const formData = new FormData();
    formData.append('phase', trial.current_phase);
    formData.append('submission_type', subType);
    formData.append('title', title.trim() || `${subType === 'argument' ? '辩论词' : subType === 'evidence' ? '证据' : '反驳'} - 自动提交`);
    if (content.trim()) formData.append('content', content.trim());
    if (file) formData.append('file', file);
    try {
      await submissionsApi.create(id, formData);
      message.info('计时结束，已自动提交当前内容');
      setTitle('');
      setContent('');
      setFile(null);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!id || !trial?.current_phase) {
      message.warning('当前无法提交');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('phase', trial.current_phase);
      formData.append('submission_type', subType);
      formData.append('title', title.trim() || `${subType === 'argument' ? '辩论词' : subType === 'evidence' ? '证据' : '反驳'} - 自动提交`);
      if (content) formData.append('content', content);
      if (file) formData.append('file', file);

      await submissionsApi.create(id, formData);
      message.success('提交成功');
      setTitle('');
      setContent('');
      setFile(null);
      submissionsApi.list(id).then((res) => setSubmissions(res.data));
    } catch (err: any) {
      message.error(err.response?.data?.detail || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!trial) return null;

  const myGroup = groups.find((g) => g.members.some((m) => m.user_id === user?.id));
  const phaseOrder = ['opening', 'evidence', 'cross_examination', 'closing', 'verdict'];
  const currentStep = trial.current_phase ? phaseOrder.indexOf(trial.current_phase) : -1;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={4} className="mb-0">庭审室 - {trial.title}</Typography.Title>
        <Space>
          {myGroup && <Tag color={myGroup.side === 'plaintiff' ? 'blue' : 'red'}>{myGroup.side === 'plaintiff' ? '原告方' : '被告方'}</Tag>}
          <Tag color={connected ? 'green' : 'red'}>{connected ? '在线' : '离线'}</Tag>
        </Space>
      </div>

      <Card className="mb-4">
        <Steps current={currentStep} size="small" items={phaseOrder.map((p) => ({ title: PHASE_LABELS[p] }))} />
        {isRunning && (
          <div className="text-center mt-4">
            <Typography.Title level={2} style={{ color: remaining <= 30 ? '#ff4d4f' : '#1890ff' }}>
              {formatTime()}
            </Typography.Title>
          </div>
        )}
      </Card>

      {evidenceItems.length > 0 && (
        <Card className="mb-4" title="案件证据材料">
          <List
            size="small"
            dataSource={evidenceItems}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={<Tag color="orange">{item.number}</Tag>}
                  description={item.description}
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {isRunning && myGroup && (
        <Card className="mb-4" title="提交材料">
          <Space direction="vertical" className="w-full">
            <Select value={subType} onChange={setSubType} className="w-48">
              <Select.Option value="argument">辩论词</Select.Option>
              <Select.Option value="evidence">证据材料</Select.Option>
              <Select.Option value="rebuttal">反驳意见</Select.Option>
            </Select>
            <Input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input.TextArea rows={4} placeholder="内容（可选）" value={content} onChange={(e) => setContent(e.target.value)} />
            <Space>
              <Upload beforeUpload={(f) => { setFile(f); return false; }} fileList={file ? [{ uid: '1', name: file.name }] : []}>
                <Button icon={<UploadOutlined />}>上传文件</Button>
              </Upload>
              <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} loading={submitting}>
                提交
              </Button>
            </Space>
          </Space>
        </Card>
      )}

      <Card title="庭审记录">
        <List
          dataSource={submissions}
          renderItem={(sub) => {
            const group = groups.find((g) => g.id === sub.group_id);
            return (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={group?.side === 'plaintiff' ? 'blue' : 'red'}>{group?.side === 'plaintiff' ? '原告' : '被告'}</Tag>
                      <Tag>{PHASE_LABELS[sub.phase]}</Tag>
                      {sub.title}
                    </Space>
                  }
                  description={sub.content || (sub.file_name ? `[文件] ${sub.file_name}` : '')}
                />
                <Typography.Text type="secondary">{new Date(sub.submitted_at).toLocaleTimeString()}</Typography.Text>
              </List.Item>
            );
          }}
          locale={{ emptyText: '暂无提交' }}
        />
      </Card>
    </div>
  );
}
