/**
 * The SSH facts these tests cover are read, never executed: a config text in,
 * destination names out. They run against the built artifact, like the fold
 * tests, so they cover what the Desktop actually loads.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSshConfig, sshCheckCommand, sshConnectDetails, sshDestinations, sshEndpoint } from '../lib/index.js';

const CONFIG = [
  '# a comment line',
  'Host prod',
  '  HostName 10.0.0.5',
  '  User ubuntu',
  '  Port 2222',
  '',
  'Host jump staging',
  '  HostName jump.example.com',
  '  User root',
  '',
  'Host *.internal',
  '  User ignored',
  '',
  'Match host example',
  '  User alsoIgnored',
  '',
  'Host prod',
  '  User second-wins-nowhere',
].join('\n');

test('concrete aliases keep their endpoint and drop wildcards and duplicates', () => {
  const hosts = parseSshConfig(CONFIG);
  assert.deepEqual(hosts.map(host => host.alias), ['prod', 'jump', 'staging']);
  assert.deepEqual(hosts[0], { alias: 'prod', hostName: '10.0.0.5', user: 'ubuntu', port: '2222' });
  assert.equal(hosts[1].hostName, 'jump.example.com');
  assert.equal(hosts[1].port, '');
  // A Match block ends the current Host block, so its options reach no alias.
  assert.equal(hosts[1].user, 'root');
});

test('an unreadable config is no hosts, not a throw', () => {
  assert.deepEqual(parseSshConfig(undefined), []);
  assert.deepEqual(parseSshConfig(''), []);
});

test('ssh destinations skip option values and read the first operand', () => {
  assert.deepEqual(sshDestinations('ssh ubuntu@43.165.171.122 uname -a'), ['43.165.171.122']);
  assert.deepEqual(sshDestinations('ssh -p 2222 prod hostname'), ['prod']);
  assert.deepEqual(sshDestinations('ssh -p2222 -o StrictHostKeyChecking=no prod hostname'), ['prod']);
  assert.deepEqual(sshDestinations('ssh -i /keys/id_ed25519 dataiyi-prod'), ['dataiyi-prod']);
});

test('scp counts only the remote operand, and a pipeline ends the command', () => {
  assert.deepEqual(sshDestinations('scp -B ./a.txt user@host:/tmp/a.txt'), ['host']);
  assert.deepEqual(sshDestinations('scp -B C:\\local\\a.txt host:/tmp/a.txt'), ['host']);
  assert.deepEqual(sshDestinations('ssh prod ls | grep x'), ['prod']);
  assert.deepEqual(sshDestinations('ssh prod ls && echo done'), ['prod']);
});

test('a command without ssh wording names nothing', () => {
  assert.deepEqual(sshDestinations('ls -la ~/.ssh'), []);
  assert.deepEqual(sshDestinations(undefined), []);
});

test('the copy texts quote the host for both shells', () => {
  assert.equal(
    sshCheckCommand('prod'),
    "ssh -o BatchMode=yes -o ConnectTimeout=10 -o ConnectionAttempts=1 -- 'prod' hostname",
  );
  assert.equal(
    sshCheckCommand("it's", 'powershell'),
    "ssh -o BatchMode=yes -o ConnectTimeout=10 -o ConnectionAttempts=1 -- 'it''s' hostname",
  );
  assert.equal(
    sshCheckCommand("it's"),
    "ssh -o BatchMode=yes -o ConnectTimeout=10 -o ConnectionAttempts=1 -- 'it'\\''s' hostname",
  );
});

test('the endpoint and the details prefer the configured endpoint, then the alias', () => {
  const prod = { alias: 'prod', hostName: '10.0.0.5', user: 'ubuntu', port: '2222' };
  assert.equal(sshEndpoint(prod), 'ubuntu@10.0.0.5:2222');
  assert.equal(sshEndpoint({ alias: 'bare', hostName: '', user: '', port: '' }), 'bare');
  assert.equal(sshEndpoint(undefined), '');
  assert.equal(
    sshConnectDetails('prod', prod, '在客户端填写远程用户名'),
    'SSH 连接资料\n主机：10.0.0.5\n端口：2222\n用户：ubuntu\nSSH 别名（本机）：prod',
  );
  assert.equal(
    sshConnectDetails('bare', undefined, '填写用户').split('\n')[3],
    '用户：填写用户',
  );
});
