import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDistance, ProximityMonitor } from '../src/services/proximity.ts';

const origin = { latitude: 0, longitude: 0 };
const far = { latitude: 0.01, longitude: 0 };
const markers = [{ id: 1, ...origin }, { id: 2, ...origin }];

function setup(overrides = {}) {
  const shown = [];
  const removed = [];
  const monitor = new ProximityMonitor({
    show: async (id) => { shown.push(id); return String(id); },
    remove: async (id) => { removed.push(id); },
    ...overrides,
  });
  return { monitor, shown, removed };
}

test('Хаверсин: совпадение, известное расстояние, линия перемены дат', () => {
  assert.equal(calculateDistance(origin, origin), 0);
  assert.ok(Math.abs(calculateDistance(origin, { latitude: 0, longitude: 1 }) - 111195) < 1);
  assert.ok(calculateDistance({ latitude: 0, longitude: 179.9999 }, { latitude: 0, longitude: -179.9999 }) < 23);
});

test('100 метров: внутри срабатывает, снаружи не срабатывает', async () => {
  const { monitor, shown } = setup();
  await monitor.update({ latitude: 0.00091, longitude: 0 }, [markers[0]], () => true);
  assert.deepEqual(shown, []);
  await monitor.update({ latitude: 0.00089, longitude: 0 }, [markers[0]], () => true);
  assert.deepEqual(shown, [1]);
});

test('параллельные обновления не дублируют уведомления для нескольких меток', async () => {
  const { monitor, shown } = setup();
  await Promise.all(Array.from({ length: 10 }, () => monitor.update(origin, markers, () => true)));
  assert.deepEqual(shown, [1, 2]);
});

test('выход очищает уведомления, повторное приближение отправляет новые', async () => {
  const { monitor, shown, removed } = setup();
  await monitor.update(origin, markers, () => true);
  await monitor.update(far, markers, () => true);
  assert.deepEqual(removed, ['1', '2']);
  await monitor.update(origin, markers, () => true);
  assert.deepEqual(shown, [1, 2, 1, 2]);
});

test('удаление метки очищает её уведомление даже без GPS', async () => {
  const { monitor, removed } = setup();
  await monitor.update(origin, markers, () => true);
  await monitor.update(null, [markers[1]], () => false);
  assert.deepEqual(removed, ['1']);
});

test('фон и отказ разрешения не отправляют уведомления; возврат не дублирует активные', async () => {
  const { monitor, shown } = setup();
  await monitor.update(origin, markers, () => false);
  assert.deepEqual(shown, []);
  await monitor.update(origin, markers, () => true);
  await monitor.update(null, markers, () => false);
  await monitor.update(origin, markers, () => true);
  assert.deepEqual(shown, [1, 2]);
});

test('сбой отправки одной метки не блокирует другую и допускает повторную попытку', async () => {
  let fail = true;
  const shown = [];
  const { monitor } = setup({ show: async (id) => {
    if (id === 1 && fail) throw new Error('send failed');
    shown.push(id);
    return String(id);
  } });
  await assert.rejects(monitor.update(origin, markers, () => true));
  assert.deepEqual(shown, [2]);
  fail = false;
  await monitor.update(origin, markers, () => true);
  assert.deepEqual(shown, [2, 1]);
});

test('неуспешная очистка повторяется при следующем обновлении', async () => {
  let attempts = 0;
  const { monitor } = setup({ remove: async () => {
    if (++attempts === 1) throw new Error('remove failed');
  } });
  await monitor.update(origin, [markers[0]], () => true);
  await assert.rejects(monitor.update(far, [], () => true));
  await monitor.update(far, [], () => true);
  assert.equal(attempts, 2);
});

test('выход во время отправки дожидается её завершения и очищает уведомление', async () => {
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const { monitor, removed } = setup({ show: async () => { await pending; return '1'; } });
  const entering = monitor.update(origin, [markers[0]], () => true);
  await Promise.resolve();
  const leaving = monitor.update(far, [markers[0]], () => true);
  finish();
  await Promise.all([entering, leaving]);
  assert.deepEqual(removed, ['1']);
});
