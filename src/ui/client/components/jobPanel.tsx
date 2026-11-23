import { memo, useEffect, useState, type ComponentType, type ReactElement } from 'react'
import type { JobRecord } from '../../shared/types'
import type { ViewKit } from '../viewkit'
import { jobDurationOf, jobPreviewOf, jobRunningOf, visibleJobs } from '../jobs'
import { IconClock } from '../primitives'

export interface JobPanelProps {
  jobs: readonly JobRecord[]
}

export function makeJobPanel(kit: ViewKit): ComponentType<JobPanelProps> {
  const { t, fmt, fmtDuration } = kit

  return memo(function JobPanel(props: JobPanelProps): ReactElement {
    kit.useLocaleTick()
    const jobs = visibleJobs(props.jobs)
    const running = jobRunningOf(jobs)
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
      setNow(Date.now())
      if (running === 0) return
      const timer = setInterval(() => { setNow(Date.now()) }, 1000)
      return () => { clearInterval(timer) }
    }, [running])
    return (
      <div className="lc-card lc-jobs-card lc-col flex-1 min-w-[min(360px,100%)]">
        <div className="lc-card-title">
          <span className="lc-card-title-text">
            <IconClock size={14} />
            {t('jobs.title')}
          </span>
          <span className="lc-jobs-summary">
            {running > 0 ? t('jobs.running', { n: fmt(running) }) : t('jobs.count', { n: fmt(jobs.length) })}
          </span>
        </div>
        <div className="lc-jobs-note">{t('jobs.note')}</div>
        {jobs.length === 0
          ? <div className="lc-empty">{t('jobs.empty')}</div>
          : (
            <ul className="lc-jobs-list">
              {jobs.map(job => (
                <li key={job.id} className={'lc-jobs-row lc-jobs-' + job.status}>
                  <i className="lc-jobs-dot" aria-hidden="true" />
                  <span className="lc-jobs-main">
                    <code className="lc-jobs-cmd" title={job.label ?? job.id}>{jobPreviewOf(job)}</code>
                    <span className="lc-jobs-meta">
                      <span className="lc-jobs-kind">{job.kind}</span>
                      <span className="lc-jobs-dur">{t('jobs.duration', { t: fmtDuration(jobDurationOf(job, now)) })}</span>
                      {job.detail !== undefined ? <span className="lc-jobs-detail">{job.detail}</span> : null}
                      {job.returned === true && job.status === 'running' ? <span className="lc-jobs-tag">{t('jobs.returned')}</span> : null}
                      <span className="lc-jobs-id" title={job.id}>{job.id}</span>
                    </span>
                  </span>
                  <span className="lc-jobs-state">{t('jobs.status.' + job.status)}</span>
                </li>
              ))}
            </ul>
          )}
      </div>
    )
  })
}