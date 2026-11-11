import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const L = require('../src/lib.js');

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const projects = [
  { id: 'P1', title: 'English', theme: { primary: '#ef5350' } },
  { id: 'P2', title: 'Paper', theme: {} },
  { id: 'P3', title: 'Old', theme: { primary: '#000' }, isArchived: true },
];

test('toDateKey uses local date and day offset', () => {
  assert.equal(L.toDateKey(at(2026, 11, 12, 23, 59)), '2026-11-12');
  assert.equal(L.toDateKey(at(2026, 11, 13, 1, 0), 4 * 3600e3), '2026-11-12');
  assert.equal(L.toDateKey(at(2026, 11, 13, 5, 0), 4 * 3600e3), '2026-11-13');
});

test('buildIndex: only done tasks with doneOn, path with parent, archive merged', () => {
  const active = [
    { id: 'A', title: 'Reading', isDone: false, projectId: 'P1', subTaskIds: ['A1', 'A2', 'A3'] },
    { id: 'A1', title: 'T2 Inference', isDone: true, doneOn: at(2026, 11, 10, 9), parentId: 'A', projectId: 'P1' },
    { id: 'A2', title: 'not done', isDone: false, doneOn: null, parentId: 'A', projectId: 'P1' },
    { id: 'A3', title: 'done without date', isDone: true, parentId: 'A', projectId: 'P1' },
    { id: 'W', title: "won't do", isDone: true, doneOn: at(2026, 11, 10), wontDoOn: at(2026, 11, 10), projectId: 'P1' },
    { id: 'N', title: 'no project', isDone: true, doneOn: at(2026, 11, 10, 8), projectId: null },
  ];
  const archived = [
    { id: 'B', title: 'Draft', isDone: true, doneOn: at(2026, 10, 1), projectId: 'P2', subTaskIds: ['B1'] },
    { id: 'B1', title: 'Intro', isDone: true, doneOn: at(2026, 10, 1, 8), parentId: 'B', projectId: null },
    { id: 'A1', title: 'stale archived copy', isDone: true, doneOn: at(2025, 1, 1), parentId: 'A', projectId: 'P1' },
  ];
  const idx = L.buildIndex(active, archived, projects, 0, { noProject: 'No project' });
  const nov10 = idx.byDay.get('2026-11-10');
  assert.deepEqual(nov10.map((i) => i.id), ['N', 'A1']);
  assert.deepEqual(nov10[1].path, ['English', 'Reading', 'T2 Inference']);
  assert.equal(nov10[1].color, '#ef5350');
  assert.equal(nov10[0].projectId, L.NO_PROJECT_ID);
  assert.equal(idx.byDay.has('2025-01-01'), false);

  const oct1 = idx.byDay.get('2026-10-01');
  assert.deepEqual(oct1.map((i) => i.path.join(' › ')), ['Paper › Draft › Intro', 'Paper › Draft']);
  assert.ok(oct1[0].color.startsWith('#'));

  const ids = idx.projects.map((p) => p.id);
  assert.ok(ids.includes('P1') && ids.includes('P2') && ids.includes(L.NO_PROJECT_ID));
  assert.ok(!ids.includes('P3'), 'archived project without done items is hidden');
  assert.equal(idx.projects.find((p) => p.id === 'P2').total, 2);
});

test('filterItems and countByProject', () => {
  const items = [
    { projectId: 'P1', projectTitle: 'a', color: 'r' },
    { projectId: 'P2', projectTitle: 'b', color: 'g' },
    { projectId: 'P2', projectTitle: 'b', color: 'g' },
  ];
  assert.equal(L.filterItems(items, new Set()).length, 3);
  assert.equal(L.filterItems(items, new Set(['P2'])).length, 2);
  assert.deepEqual(L.countByProject(items).map((g) => [g.projectId, g.count]), [['P2', 2], ['P1', 1]]);
});

test('monthGrid covers the month in full weeks', () => {
  const nov = L.monthGrid(2026, 10, 0); // November 2026, Sunday start
  assert.equal(nov[0][0].key, '2026-11-01'); // Nov 1 2026 is a Sunday
  const flat = nov.flat();
  assert.equal(flat.filter((c) => c.inMonth).length, 30);
  assert.equal(flat.length % 7, 0);
  const feb = L.monthGrid(2026, 1, 0);
  assert.equal(feb[0][0].key, '2026-02-01');
  assert.equal(feb.length, 4);
  const dec = L.monthGrid(2026, 11, 0);
  assert.equal(dec[0][0].key, '2026-11-29');
  assert.equal(dec.at(-1).at(-1).key, '2027-01-02');
});

test('intensityLevel', () => {
  assert.equal(L.intensityLevel(0, 10), 0);
  assert.equal(L.intensityLevel(1, 10), 1);
  assert.equal(L.intensityLevel(5, 10), 2);
  assert.equal(L.intensityLevel(10, 10), 4);
  assert.equal(L.intensityLevel(1, 1), 2);
});

test('signature changes when a task is completed', () => {
  const t = { id: 'X', title: 'x', isDone: true, doneOn: at(2026, 11, 1), projectId: 'P1' };
  const a = L.signature(L.buildIndex([t], [], projects));
  const b = L.signature(L.buildIndex([{ ...t, doneOn: at(2026, 11, 2) }], [], projects));
  assert.notEqual(a, b);
  assert.equal(a, L.signature(L.buildIndex([t], [], projects)));
});
