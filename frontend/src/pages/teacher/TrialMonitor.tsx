import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Tag, Button, Steps, List, Space, message } from 'antd';
import { PlayCircleOutlined, StepForwardOutlined, StopOutlined, RetweetOutlined } from '@ant-design/icons';
import { trialsApi } from '../../api/trials';
import { TrialSession, TrialStatus, TrialPhase, Group } from '../../types/trial';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTimer } from '../../hooks/useTimer';

const PHASE_LABELS: Record<string, string> = {
  opening: '开庭陈述',
  evidence: '举证质证',
  cross_examination: '辩论交锋',
  closing: '最后陈述',
  verdict: '评议宣判',
};

export default function TrialDetail() {
  const { id } = useParams<{ id: string }>();
  const [trial, setTrial] = useState<TrialSession | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lastMessage, connected } = useWebSocket(id || null);

  const isRunning = trial?.status === TrialStatus.IN_PROGRESS;
  const { remaining, formatTime, syncTime } = useTimer(
    trial?.phase_duration_seconds || 0,
    isRunning
  );

  useEffect(() => {
    if (id) {
      trialsApi.get(id).then((res) => setTrial(res.data));
      trialsApi.getGroups(id).then((res) => setGroups(res.data));
    }
  }, [id]);

  useEffect(() => {
    if (!lastMessage) return;
    const { event, data } = lastMessage;
    if (event === 'phase.time_update') {
      syncTime((data as any).remaining_seconds);
    } else if (event === 'phase.changed' || event === 'trial.started') {
      if (id) trialsApi.get(id).then((res) => setTrial(res.data));
    } else if (event === 'trial.ended') {
      if (id) trialsApi.get(id).then((res) => setTrial(res.data));
    }
  }, [lastMessage]);

  const handleStart = async () => {
    if (!id) return;
    try {
      const res = await trialsApi.start(id);
      setTrial(res.data);
      message.success('庭审已开始');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '操作失败');
    }
  };

  const handleNextPhase = async () => {
    if (!id) return;
    try {
      const res = await trialsApi.nextPhase(id);
      setTrial(res.data);
      message.success('已进入下一阶段');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '操作失败');
    }
  };

  const handleEnd = async () => {
    if (!id) return;
    try {
      const res = await trialsApi.end(id);
      setTrial(res.data);
      message.success('庭审已结束');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '操作失败');
    }
  };

  const handleDrawLots = async () => {
    if (!id) return;
    try {
      const res = await trialsApi.drawLots(id);
      setGroups(res.data);
      message.success(`抽签完成（${new Date().toLocaleTimeString()}）`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '抽签失败');
    }
  };

  if (!trial) return null;

  const phaseOrder = ['opening', 'evidence', 'cross_examination', 'closing', 'verdict'];
  const currentStep = trial.current_phase ? phaseOrder.indexOf(trial.current_phase) : -1;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={4} className="mb-0">{trial.title}</Typography.Title>
        <Space>
          <Tag color={connected ? 'green' : 'red'}>{connected ? '已连接' : '未连接'}</Tag>
          <Button onClick={() => navigate('/trials')}>返回列表</Button>
        </Space>
      </div>

      <Card className="mb-4">
        <Steps
          current={currentStep}
          items={phaseOrder.map((p) => ({ title: PHASE_LABELS[p] }))}
        />
        {isRunning && (
          <div className="text-center mt-4">
            <Typography.Title level={2} style={{ color: remaining <= 30 ? '#ff4d4f' : '#1890ff' }}>
              {formatTime()}
            </Typography.Title>
            <Typography.Text type="secondary">当前阶段：{PHASE_LABELS[trial.current_phase!]}</Typography.Text>
          </div>
        )}
      </Card>

      {(user?.role === UserRole.TEACHER || user?.role === UserRole.JUDGE) && (
        <Card className="mb-4" title="庭审控制">
          <Space>
            {trial.status === TrialStatus.PENDING && (
              <>
                <Button icon={<RetweetOutlined />} onClick={handleDrawLots}>抽签分组</Button>
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}>开始庭审</Button>
              </>
            )}
            {isRunning && (
              <>
                <Button icon={<StepForwardOutlined />} onClick={handleNextPhase}>下一阶段</Button>
                <Button danger icon={<StopOutlined />} onClick={handleEnd}>结束庭审</Button>
              </>
            )}
            {trial.status === TrialStatus.COMPLETED && (
              <Button type="primary" onClick={() => navigate(`/trials/${id}/report`)}>查看报告</Button>
            )}
          </Space>
        </Card>
      )}

      <Card title="分组信息">
        <List
          dataSource={groups}
          renderItem={(group) => (
            <List.Item>
              <List.Item.Meta
                title={<><Tag color={group.side === 'plaintiff' ? 'blue' : 'red'}>{group.side === 'plaintiff' ? '原告方' : '被告方'}</Tag> {group.name}</>}
                description={
                  <>
                    <div>成员：{group.members.map((m) => m.full_name || m.user_id).join('、') || '暂无成员'}</div>
                    <div>抽签时间：{new Date(group.drawn_at).toLocaleString()}</div>
                  </>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: '暂未分组，请点击"抽签分组"按钮' }}
        />
      </Card>
    </div>
  );
}
