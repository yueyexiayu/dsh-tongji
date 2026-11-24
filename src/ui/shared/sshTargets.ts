/**
 * SSH facts shared by the host route and the client card.
 *
 * Two independent sources feed the card: the aliases the user configured in
 * `~/.ssh/config`, and the hosts this conversation actually reached with
 * ssh/scp/sftp. Both parsers are dependency free so the host can reuse them
 * without pulling React into a route module.
 */

export interface SshHostConfig {
  alias: string
  hostName: string
  user: string
  port: string
}

export interface SshConnection {
  host: string
  ok: boolean
  count: number
  turn: number
  seq: number
}

export const SSH_MAX_CONFIG_HOSTS = 24

export const SSH_MAX_CONNECTIONS = 20

/**
 * Concrete host aliases of an OpenSSH client configuration.
 *
 * Wildcard and negated entries describe a rule rather than a destination, so
 * they never reach the card; options other than HostName/User/Port are ignored
 * (keys and identities are never read). As in OpenSSH, the first value of an
 * option wins.
 */
export function parseSshConfig(text: unknown): SshHostConfig[] {
  if (typeof text !== 'string') return []
  const hosts: SshHostConfig[] = []
  let current: SshHostConfig[] = []
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.replace(/(^|\s)#.*$/u, '').trim()
    if (line === '') continue
    const match = /^(\S+)\s*(?:=\s*|\s)(.*)$/u.exec(line)
    if (match === null) continue
    const key = match[1].toLowerCase()
    const value = match[2].trim().replace(/^"(.*)"$/u, '$1')
    if (key === 'host') {
      current = []
      for (const alias of value.split(/\s+/u)) {
        if (alias === '' || /[*?!]/u.test(alias) || hosts.some(host => host.alias === alias)) continue
        const host: SshHostConfig = { alias, hostName: '', user: '', port: '' }
        hosts.push(host)
        current.push(host)
      }
    } else if (key === 'match') {
      current = []
    } else if (current.length > 0) {
      const field = key === 'hostname' ? 'hostName' : key === 'user' ? 'user' : key === 'port' ? 'port' : undefined
      if (field !== undefined) {
        for (const host of current) if (host[field] === '') host[field] = value
      }
    }
  }
  return hosts.slice(0, SSH_MAX_CONFIG_HOSTS)
}

/** Where an OpenSSH client typically lives, in the order worth probing. */
export function sshClientCandidates(platform: string, env: { SystemRoot?: string | undefined }): string[] {
  if (platform === 'win32') {
    const root = env.SystemRoot !== undefined && env.SystemRoot !== '' ? env.SystemRoot : 'C:\\Windows'
    return [root + '\\System32\\OpenSSH\\ssh.exe']
  }
  return ['/usr/bin/ssh', '/usr/local/bin/ssh', '/opt/homebrew/bin/ssh', '/bin/ssh']
}

const SSH_VALUE_OPTIONS = new Set('BbcDEeFIiJLlmOoPpQRSWw'.split(''))

const SSH_PROGRAM = /^(?:.*[\\/])?(ssh|scp|sftp)(?:\.exe)?$/iu

const WORD = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/gu

function words(command: string): string[] {
  const out: string[] = []
  for (const match of command.matchAll(WORD)) out.push(match[1] ?? match[2] ?? match[3] ?? '')
  return out
}

function hostOf(destination: string): string | undefined {
  let value = destination.replace(/^(?:ssh|sftp):\/\//iu, '')
  value = value.replace(/^[^@/]*@/u, '')
  value = value.replace(/^\[([^\]]+)\].*$/u, '$1')
  value = value.split(/[:/]/u)[0] ?? ''
  return /^[A-Za-z0-9._-]+$/u.test(value) ? value : undefined
}

/**
 * Destinations of the ssh, scp and sftp invocations in one shell command.
 *
 * Only the command text is read: no process is started and no host is
 * contacted. Options that take a value are skipped so `-p 2222 host` and
 * `-p2222 host` both name `host`; for scp only `host:path` operands count.
 */
export function sshDestinations(command: unknown): string[] {
  if (typeof command !== 'string' || !/\b(?:ssh|scp|sftp)\b/iu.test(command)) return []
  const found: string[] = []
  const tokens = words(command)
  for (let index = 0; index < tokens.length; index++) {
    const program = SSH_PROGRAM.exec(tokens[index])?.[1]?.toLowerCase()
    if (program === undefined) continue
    for (let at = index + 1; at < tokens.length; at++) {
      const token = tokens[at]
      if (/^[;&|)]|^\|\|$|^&&$/u.test(token)) break
      if (token.startsWith('-') && token.length > 1) {
        if (token.length === 2 && SSH_VALUE_OPTIONS.has(token[1])) at++
        continue
      }
      if (program === 'scp' && (!/^[^/\\]*:/u.test(token) || /^[A-Za-z]:[\\/]/u.test(token))) continue
      const host = hostOf(token)
      if (host !== undefined && !found.includes(host)) found.push(host)
      if (program !== 'scp') break
    }
  }
  return found
}

/** `user@host:port` for a configured alias, or '' when it adds nothing. */
export function sshEndpoint(config: SshHostConfig | undefined): string {
  if (config === undefined) return ''
  const user = config.user === '' ? '' : config.user + '@'
  const port = config.port === '' || config.port === '22' ? '' : ':' + config.port
  const target = config.hostName === '' || config.hostName === config.alias ? config.alias : config.hostName
  return user + target + port
}

/** A non-interactive check the user can paste in the shell that owns the keys. */
export function sshCheckCommand(host: string, shell: 'posix' | 'powershell' = 'posix'): string {
  const escape = shell === 'powershell' ? "''" : "'\\''"
  return 'ssh -o BatchMode=yes -o ConnectTimeout=10 -o ConnectionAttempts=1 -- ' + "'" + host.replaceAll("'", escape) + "' hostname"
}

/** Connection details for a remote client that takes host, port and user itself. */
export function sshConnectDetails(host: string, config: SshHostConfig | undefined, userFallback: string): string {
  const name = config !== undefined && config.hostName !== '' ? config.hostName : host
  const port = config !== undefined && config.port !== '' ? config.port : '22'
  const user = config !== undefined && config.user !== '' ? config.user : userFallback
  return [
    'SSH 连接资料',
    '主机：' + name,
    '端口：' + port,
    '用户：' + user,
    'SSH 别名（本机）：' + host,
  ].join('\n')
}
