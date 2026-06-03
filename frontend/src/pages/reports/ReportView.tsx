import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Table, Tag, Button, Statistic, Row, Col, message } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { reportsApi } from '../../api/reports';

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
  rebuttal: '反驳',
};

export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      reportsApi.get(id).then((res) => setReport(res.data.report_content)).catch(() => {});
    }
  }, [id]);

  const handleGenerate = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await reportsApi.generate(id);
      setReport(res.data.report_content);
      message.success('报告生成成功');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const winnerText: Record<string, string> = { plaintiff: '原告胜诉', defendant: '被告胜诉', draw: '平局' };
  const winnerColor: Record<string, string> = { plaintiff: '#1890ff', defendant: '#ff4d4f', draw: '#faad14' };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={4} className="mb-0">庭审报告</Typography.Title>
        <div>
          <Button type="primary" onClick={handleGenerate} loading={loading} className="mr-2">生成/更新报告</Button>
          <Button onClick={() => navigate(`/trials/${id}`)}>返回庭审</Button>
        </div>
      </div>

      {!report ? (
        <Card><Typography.Text type="secondary">报告尚未生成，请点击"生成/更新报告"按钮。</Typography.Text></Card>
      ) : (
        <>
          {/* Result Summary */}
          <Card className="mb-4">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="原告方加权总分" value={report.result.plaintiff_total} valueStyle={{ color: '#1890ff' }} suffix="分" />
              </Col>
              <Col span={8}>
                <Statistic title="被告方加权总分" value={report.result.defendant_total} valueStyle={{ color: '#ff4d4f' }} suffix="分" />
              </Col>
              <Col span={8}>
                <Statistic
                  title="裁判结果"
                  value={winnerText[report.result.winner]}
                  valueStyle={{ color: winnerColor[report.result.winner] }}
                  prefix={<TrophyOutlined />}
                />
              </Col>
            </Row>
            <Typography.Text type="secondary" className="block mt-2">
              计分方式：{report.result.scoring_method}
            </Typography.Text>
          </Card>

          {/* Per-Group Phase Scores Table with Weights */}
          <Card className="mb-4" title="各阶段得分汇总">
            <Table
              size="small"
              pagination={false}
              dataSource={(() => {
                const phases = Object.keys(PHASE_LABELS);
                return phases.map((phase) => {
                  const row: any = { key: phase, phase };
                  const weight = report.result.phase_weights?.[phase] ?? 1.0;
                  row.weight = weight;
                  for (const group of report.groups) {
                    const avg = group.phase_averages?.[phase] ?? '-';
                    row[`${group.side}_avg`] = avg;
                    row[`${group.side}_weighted`] = typeof avg === 'number' ? (avg * weight).toFixed(2) : '-';
                  }
                  return row;
                });
              })()}
              columns={[
                { title: '阶段', dataIndex: 'phase', render: (p: string) => PHASE_LABELS[p] || p },
                { title: '权重', dataIndex: 'weight', render: (w: number) => `×${w}` },
                { title: '原告方平均分', dataIndex: 'plaintiff_avg', render: (v: any) => typeof v === 'number' ? `${v}/10` : v },
                { title: '原告方加权分', dataIndex: 'plaintiff_weighted' },
                { title: '被告方平均分', dataIndex: 'defendant_avg', render: (v: any) => typeof v === 'number' ? `${v}/10` : v },
                { title: '被告方加权分', dataIndex: 'defendant_weighted' },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><strong>总分</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} />
                  <Table.Summary.Cell index={2} />
                  <Table.Summary.Cell index={3}><strong style={{ color: '#1890ff' }}>{report.result.plaintiff_total}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} />
                  <Table.Summary.Cell index={5}><strong style={{ color: '#ff4d4f' }}>{report.result.defendant_total}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>

          {/* Case Info */}
          <Card className="mb-4" title="案件信息">
            <Typography.Title level={5}>{report.case?.title}</Typography.Title>
            <Typography.Paragraph>{report.case?.description}</Typography.Paragraph>
          </Card>

          {/* Itemized Submissions with Scores - proper table */}
          <Card className="mb-4" title="分项评分明细">
            <Table
              dataSource={report.submissions}
              pagination={false}
              rowKey="id"
              columns={[
                {
                  title: '方', dataIndex: 'group_id', width: 60,
                  render: (_: string, record: any) => {
                    const group = report.groups.find((g: any) => g.id === record.group_id);
                    return <Tag color={group?.side === 'plaintiff' ? 'blue' : 'red'}>{group?.side === 'plaintiff' ? '原告' : '被告'}</Tag>;
                  },
                },
                {
                  title: '阶段', dataIndex: 'phase', width: 100,
                  render: (p: string) => PHASE_LABELS[p],
                },
                {
                  title: '类型', dataIndex: 'type', width: 70,
                  render: (t: string) => (
                    <Tag color={t === 'evidence' ? 'orange' : t === 'rebuttal' ? 'purple' : 'cyan'}>
                      {SUB_TYPE_LABELS[t]}
                    </Tag>
                  ),
                },
                { title: '标题', dataIndex: 'title', width: 150 },
                {
                  title: '内容摘要', dataIndex: 'content', width: 200,
                  render: (c: string) => c ? c.substring(0, 50) + (c.length > 50 ? '...' : '') : '-',
                },
                {
                  title: '得分', dataIndex: 'score', width: 70,
                  render: (s: number | null) => s !== null && s !== undefined ?
                    <Tag color="green">{s}/10</Tag> : <Tag>未评分</Tag>,
                },
                {
                  title: '评语', dataIndex: 'score_comments', width: 150,
                  render: (c: string) => c || '-',
                },
                {
                  title: '提交时间', dataIndex: 'submitted_at', width: 90,
                  render: (t: string) => new Date(t).toLocaleTimeString(),
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
