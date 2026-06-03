import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, InputNumber, Input, Button, Tag, List, Space, message, Steps, Collapse } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { trialsApi } from '../../api/trials';
import { submissionsApi } from '../../api/submissions';
import { scoresApi, SubmissionScoreResponse } from '../../api/scores';
import { TrialSession, TrialStatus, Group, Submission } from '../../types/trial';
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

const SUB_TYPE_LABELS: Record<string, string> = {
  argument: '辩论词',
  evidence: '证据',
  rebuttal: '反驳意见',
};

export default function TrialJudge() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [trial, setTrial] = useState<TrialSession | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subScores, setSubScores] = useState<SubmissionScoreResponse[]>([]);
  const [pendingScores, setPendingScores] = useState<Record<string, number>>({});
  const [pendingComments, setPendingComments] = useState<Record<string, string>>({});

  const { lastMessage, connected } = useWebSocket(id || null);
  const isRunning = trial?.status === TrialStatus.IN_PROGRESS;
  const { remaining, formatTime, syncTime } = useTimer(trial?.phase_duration_seconds || 0, isRunning);

  useEffect(() => {
    if (id) {
      trialsApi.get(id).then((res) => setTrial(res.data));
      trialsApi.getGroups(id).then((res) => setGroups(res.data));
      submissionsApi.list(id).then((res) => setSubmissions(res.data));
      scoresApi.listSubmissionScores(id).then((res) => setSubScores(res.data));
    }
  }, [id]);

  useEffect(() => {
    if (!lastMessage) return;
    const { event, data } = lastMessage;
    if (event === 'phase.time_update') syncTime((data as any).remaining_seconds);
    else if (event === 'phase.changed' || event === 'trial.started' || event === 'trial.ended') {
      if (id) trialsApi.get(id).then((res) => setTrial(res.data));
    } else if (event === 'submission.new') {
      if (id) submissionsApi.list(id).then((res) => setSubmissions(res.data));
    }
  }, [lastMessage]);

  const handleScoreSubmission = async (submissionId: string) => {
    if (!id) return;
    const score = pendingScores[submissionId];
    if (score === undefined || score < 0 || score > 10) {
      message.warning('请输入0-10的分数');
      return;
    }
    try {
      await scoresApi.scoreSubmission(id, {
        submission_id: submissionId,
        score,
        comments: pendingComments[submissionId] || undefined,
      });
      message.success('评分成功');
      scoresApi.listSubmissionScores(id).then((res) => setSubScores(res.data));
      setPendingScores((prev) => { const n = { ...prev }; delete n[submissionId]; return n; });
      setPendingComments((prev) => { const n = { ...prev }; delete n[submissionId]; return n; });
    } catch (err: any) {
      message.error(err.response?.data?.detail || '评分失败');
    }
  };

  if (!trial) return null;

  const phaseOrder = ['opening', 'evidence', 'cross_examination', 'closing', 'verdict'];
  const currentStep = trial.current_phase ? phaseOrder.indexOf(trial.current_phase) : -1;
  const scoreMap: Record<string, SubmissionScoreResponse> = {};
  for (const ss of subScores) {
    scoreMap[ss.submission_id] = ss;
  }

  const renderSubmissionItem = (sub: Submission) => {
    const existingScore = scoreMap[sub.id];
    return (
      <div key={sub.id} className="border-b border-gray-100 py-2 last:border-b-0">
        <Space className="mb-1">
          <Tag color={sub.submission_type === 'evidence' ? 'orange' : sub.submission_type === 'rebuttal' ? 'purple' : 'cyan'}>
            {SUB_TYPE_LABELS[sub.submission_type]}
          </Tag>
          <Tag>{PHASE_LABELS[sub.phase]}</Tag>
          <Typography.Text strong>{sub.title}</Typography.Text>
          <Typography.Text type="secondary">{new Date(sub.submitted_at).toLocaleTimeString()}</Typography.Text>
        </Space>
        {sub.content && (
          <Typography.Paragraph className="mt-1 mb-1 pl-2 border-l-2 border-gray-200" style={{ whiteSpace: 'pre-wrap' }}>
            {sub.content}
          </Typography.Paragraph>
        )}
        {sub.file_name && (
          <Typography.Text type="secondary" className="block pl-2">[文件] {sub.file_name}</Typography.Text>
        )}
        <div className="mt-2 flex items-center gap-2">
          {existingScore ? (
            <Space>
              <Tag color="green">已评分: {existingScore.score}/10</Tag>
              {existingScore.comments && <Typography.Text type="secondary">{existingScore.comments}</Typography.Text>}
            </Space>
          ) : (
            <Space>
              <InputNumber
                min={0} max={10} size="small" placeholder="分数"
                value={pendingScores[sub.id]}
                onChange={(v) => setPendingScores((prev) => ({ ...prev, [sub.id]: v ?? 0 }))}
              />
              <Input
                size="small" placeholder="评语(可选)" className="w-40"
                value={pendingComments[sub.id] || ''}
                onChange={(e) => setPendingComments((prev) => ({ ...prev, [sub.id]: e.target.value }))}
              />
              <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleScoreSubmission(sub.id)}>
                打分
              </Button>
            </Space>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={4} className="mb-0">法官评分 - {trial.title}</Typography.Title>
        <Tag color={connected ? 'green' : 'red'}>{connected ? '在线' : '离线'}</Tag>
      </div>

      <Card className="mb-4">
        <Steps current={currentStep} size="small" items={phaseOrder.map((p) => ({ title: PHASE_LABELS[p] }))} />
        {isRunning && (
          <div className="text-center mt-4">
            <Typography.Title level={2} style={{ color: remaining <= 30 ? '#ff4d4f' : '#1890ff' }}>
              {formatTime()}
            </Typography.Title>
            <Typography.Text type="secondary">当前阶段：{PHASE_LABELS[trial.current_phase!]}</Typography.Text>
          </div>
        )}
      </Card>

      {groups.map((group) => {
        const groupSubs = submissions.filter((s) => s.group_id === group.id);
        const evidenceSubs = groupSubs.filter((s) => s.submission_type === 'evidence');
        const argumentSubs = groupSubs.filter((s) => s.submission_type !== 'evidence');

        const collapseItems = [];
        if (evidenceSubs.length > 0) {
          collapseItems.push({
            key: `${group.id}-evidence`,
            label: `证据材料 (${evidenceSubs.length})`,
            children: <div>{evidenceSubs.map(renderSubmissionItem)}</div>,
          });
        }
        if (argumentSubs.length > 0) {
          collapseItems.push({
            key: `${group.id}-arguments`,
            label: `辩论词/陈述 (${argumentSubs.length})`,
            children: <div>{argumentSubs.map(renderSubmissionItem)}</div>,
          });
        }

        return (
          <Card
            key={group.id}
            className="mb-4"
            title={
              <Space>
                <Tag color={group.side === 'plaintiff' ? 'blue' : 'red'}>
                  {group.side === 'plaintiff' ? '原告方' : '被告方'}
                </Tag>
                {group.name}
                <Typography.Text type="secondary">({groupSubs.length} 项提交)</Typography.Text>
              </Space>
            }
          >
            {collapseItems.length > 0 ? (
              <Collapse accordion items={collapseItems} />
            ) : (
              <Typography.Text type="secondary">暂无提交</Typography.Text>
            )}
          </Card>
        );
      })}
    </div>
  );
}
