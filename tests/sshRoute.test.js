/**
 * The SSH route against a fake host: what it reads per request, and that the
 * fold reaches hosts the panel's trimmed command list no longer holds.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerSshRoute } from '../lib/index.js';

const call = (seq, callId, command, turn) => ({
  type: 'tool/call',
  seq,
  time: seq * 1000,
  data: { callId, name: 'bash', arguments: { command }, turn },
});

const result = (seq, callId, isError = false) => ({
  type: 'tool/result',
  seq,
  time: seq * 1000,
  data: { callId, isError },
});

function hostOf(options) {
  const routes = [];
  const ctx = {
    connection: { fetch: { register(value) { routes.push(value); } } },
    sessionQuery: { async observeSession() { return options.observation(); } },
  };
  registerSshRoute(ctx, options);
  const route = routes.find(item => item.path === '/api/tongji/ssh');
  assert.ok(route, 'the ssh route must be registered');
  return route;
}

const configOf = (aliases) => () => aliases.map(alias => ({ alias, hostName: '', user: '', port: '' }));

test('the configuration is re-read on every request', async () => {
  let aliases = ['first'];
  const route = hostOf({
    readConfig: () => aliases.map(alias => ({ alias, hostName: '', user: '', port: '' })),
    readClient: () => '/usr/bin/ssh',
    observation: () => ({ inheritedEventCount: 0, events: [], [Symbol.dispose]() {} }),
  });
  const first = await (await route.fetch(new Request('http://x/api/tongji/ssh'))).json();
  assert.deepEqual(first.hosts.map(host => host.alias), ['first']);
  assert.equal(first.client, '/usr/bin/ssh');
  aliases = ['first', 'second'];
  const second = await (await route.fetch(new Request('http://x/api/tongji/ssh'))).json();
  assert.deepEqual(second.hosts.map(host => host.alias), ['first', 'second'], 'no reload needed');
});

test('a host reached before the command list was trimmed is still counted', async () => {
  // 500 commands with no destination, then the one that matters at the front:
  // the panel keeps only maxCommands of them, the route keeps the host.
  const events = [call(1, 'early', 'ssh dataiyi-prod hostname', 1), result(2, 'early')];
  for (let index = 0; index < 500; index++) {
    events.push(call(3 + index * 2, 'c' + index, 'echo ' + index, 1));
    events.push(result(4 + index * 2, 'c' + index));
  }
  const route = hostOf({
    readConfig: configOf([]),
    readClient: () => '',
    observation: () => ({ inheritedEventCount: 0, events, [Symbol.dispose]() {} }),
  });
  const body = await (await route.fetch(new Request('http://x/api/tongji/ssh?sessionId=root'))).json();
  assert.deepEqual(body.connections.map(row => row.host), ['dataiyi-prod']);
  assert.equal(body.connections[0].count, 1);
  assert.equal(body.connections[0].ok, true);
  assert.equal(body.connections[0].turn, 1);
  assert.equal(body.events, events.length);
});

test('a failed call is reported as failed and a repeated host counts up', async () => {
  const events = [
    call(1, 'a', 'ssh prod hostname', 2), result(2, 'a'),
    call(3, 'b', 'scp -B ./x user@prod:/tmp/x', 3), result(4, 'b', true),
  ];
  const route = hostOf({
    readConfig: configOf([]),
    readClient: () => '/usr/bin/ssh',
    observation: () => ({ inheritedEventCount: 0, events, [Symbol.dispose]() {} }),
  });
  const body = await (await route.fetch(new Request('http://x/api/tongji/ssh?sessionId=root'))).json();
  assert.equal(body.connections.length, 1);
  assert.equal(body.connections[0].host, 'prod');
  assert.equal(body.connections[0].count, 2);
  assert.equal(body.connections[0].ok, false, 'the latest outcome wins');
  assert.equal(body.connections[0].turn, 3);
});

test('the session observation is disposed and a session id is optional', async () => {
  let disposed = false;
  const route = hostOf({
    readConfig: configOf(['prod']),
    readClient: () => '',
    observation: () => ({ inheritedEventCount: 0, events: [call(1, 'a', 'ssh prod', 1), result(2, 'a')], [Symbol.dispose]() { disposed = true; } }),
  });
  const body = await (await route.fetch(new Request('http://x/api/tongji/ssh?sessionId=root'))).json();
  assert.equal(disposed, true);
  assert.equal(body.connections.length, 1);
  const withoutSession = await (await route.fetch(new Request('http://x/api/tongji/ssh'))).json();
  assert.deepEqual(withoutSession.connections, []);
  assert.deepEqual(withoutSession.hosts.map(host => host.alias), ['prod']);
});
