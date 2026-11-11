/*
 * Pure data helpers for the Daily Report plugin.
 * No DOM, no PluginAPI: the build inlines this file into index.html, and the
 * tests load it in Node.
 */
(function (root) {
  'use strict';

  var NO_PROJECT_ID = '__none__';
  var FALLBACK_COLORS = ['#7e57c2', '#26a69a', '#ffa726', '#8d6e63', '#78909c', '#d4e157'];
  var NO_PROJECT_COLOR = '#9e9e9e';
  var DEFAULT_LABELS = { noProject: 'No project', deletedProject: '(deleted project)', untitled: '(untitled)' };

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /** Local-date key (YYYY-MM-DD) for a timestamp, shifted back by the
   *  app's "start of next day" offset so a 1 a.m. check counts for the
   *  previous day when the user set the day to end at e.g. 4 a.m. */
  function toDateKey(ms, dayOffsetMs) {
    var d = new Date(ms - (dayOffsetMs || 0));
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function dateKeyOf(year, month, day) {
    return year + '-' + pad(month + 1) + '-' + pad(day);
  }

  function isCountable(task) {
    return !!(task && task.isDone && typeof task.doneOn === 'number' && task.doneOn > 0 && !task.wontDoOn);
  }

  /**
   * Build the per-day index of completed tasks.
   * @param {Array} activeTasks   result of PluginAPI.getTasks()
   * @param {Array} archivedTasks result of PluginAPI.getArchivedTasks()
   * @param {Array} projects      result of PluginAPI.getAllProjects()
   * @param {number} dayOffsetMs  startOfNextDayDiffMs (0 if unknown)
   * @param {object} labels      { noProject, deletedProject, untitled }
   */
  function buildIndex(activeTasks, archivedTasks, projects, dayOffsetMs, labels) {
    labels = Object.assign({}, DEFAULT_LABELS, labels || {});
    var byId = new Map();
    // Archived first, active second: if a task exists in both, the active copy wins.
    (archivedTasks || []).forEach(function (t) {
      if (t && t.id) byId.set(t.id, t);
    });
    (activeTasks || []).forEach(function (t) {
      if (t && t.id) byId.set(t.id, t);
    });

    var projectMap = new Map();
    var fallbackIdx = 0;
    (projects || []).forEach(function (p) {
      if (!p || !p.id) return;
      var color = p.theme && typeof p.theme.primary === 'string' && p.theme.primary;
      if (!color) color = FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length];
      projectMap.set(p.id, { id: p.id, title: p.title || p.id, color: color, isArchived: !!p.isArchived });
    });

    function projectInfo(projectId) {
      if (!projectId) return { id: NO_PROJECT_ID, title: labels.noProject, color: NO_PROJECT_COLOR };
      var p = projectMap.get(projectId);
      if (p) return p;
      // Project deleted but tasks remain in the archive.
      p = { id: projectId, title: labels.deletedProject, color: NO_PROJECT_COLOR };
      projectMap.set(projectId, p);
      return p;
    }

    var byDay = new Map();
    var plannedByDay = new Map();
    var usedProjects = new Map();
    var activeIds = new Set(
      (activeTasks || []).map(function (t) {
        return t && t.id;
      }),
    );

    function useProject(project, field) {
      var used = usedProjects.get(project.id);
      if (!used) {
        used = { id: project.id, title: project.title, color: project.color, total: 0, plannedTotal: 0 };
        usedProjects.set(project.id, used);
      }
      used[field]++;
    }

    byId.forEach(function (task) {
      var isDoneItem = isCountable(task);
      var plannedKey = !isDoneItem && activeIds.has(task.id) ? plannedDateKey(task, dayOffsetMs) : null;
      if (!isDoneItem && !plannedKey) return;
      var parent = task.parentId ? byId.get(task.parentId) : null;
      // Subtasks inherit the parent's project; fall back to it if missing.
      var projectId = task.projectId || (parent && parent.projectId) || null;
      var project = projectInfo(projectId);
      var path = [project.title];
      if (parent && parent.title) path.push(parent.title);
      path.push(task.title || labels.untitled);

      if (plannedKey) {
        var pItem = {
          id: task.id,
          title: task.title || labels.untitled,
          path: path,
          projectId: project.id,
          projectTitle: project.title,
          color: project.color,
          due: typeof task.dueWithTime === 'number' && task.dueWithTime > 0 ? task.dueWithTime : null,
          isSubTask: !!task.parentId,
        };
        if (!plannedByDay.has(plannedKey)) plannedByDay.set(plannedKey, []);
        plannedByDay.get(plannedKey).push(pItem);
        useProject(project, 'plannedTotal');
        return;
      }

      var item = {
        id: task.id,
        title: task.title || labels.untitled,
        path: path,
        projectId: project.id,
        projectTitle: project.title,
        color: project.color,
        doneOn: task.doneOn,
        isSubTask: !!task.parentId,
      };
      var key = toDateKey(task.doneOn, dayOffsetMs);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(item);

      useProject(project, 'total');
    });

    byDay.forEach(function (items) {
      items.sort(function (a, b) {
        return a.doneOn - b.doneOn;
      });
    });
    // Timed items first (by time), then the rest by path.
    plannedByDay.forEach(function (items) {
      items.sort(function (a, b) {
        if (a.due && b.due) return a.due - b.due;
        if (a.due) return -1;
        if (b.due) return 1;
        return a.path.join('\u0000').localeCompare(b.path.join('\u0000'));
      });
    });

    // Projects for the filter: every known non-archived project, plus any
    // other project that has completed items.
    var filterProjects = [];
    projectMap.forEach(function (p) {
      var used = usedProjects.get(p.id);
      if (!p.isArchived || used) {
        filterProjects.push({
          id: p.id,
          title: p.title,
          color: p.color,
          total: used ? used.total : 0,
          plannedTotal: used ? used.plannedTotal : 0,
        });
      }
    });
    if (usedProjects.has(NO_PROJECT_ID)) filterProjects.push(usedProjects.get(NO_PROJECT_ID));

    return { byDay: byDay, plannedByDay: plannedByDay, projects: filterProjects };
  }

  /** Planned day of an unfinished task: its scheduled time if it has one,
   *  otherwise its planned day (dueDay, already a logical-day string). */
  function plannedDateKey(task, dayOffsetMs) {
    if (!task || task.isDone || task.wontDoOn) return null;
    if (typeof task.dueWithTime === 'number' && task.dueWithTime > 0) return toDateKey(task.dueWithTime, dayOffsetMs);
    if (typeof task.dueDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDay)) return task.dueDay;
    return null;
  }

  /** Items of a day, limited to the selected projects (null/empty = all). */
  function filterItems(items, selectedIds) {
    if (!items) return [];
    if (!selectedIds || selectedIds.size === 0) return items;
    return items.filter(function (it) {
      return selectedIds.has(it.projectId);
    });
  }

  /** Count per project for a list of items, most first. */
  function countByProject(items) {
    var m = new Map();
    items.forEach(function (it) {
      var e = m.get(it.projectId);
      if (!e) {
        e = { projectId: it.projectId, title: it.projectTitle, color: it.color, count: 0 };
        m.set(it.projectId, e);
      }
      e.count++;
    });
    return Array.from(m.values()).sort(function (a, b) {
      return b.count - a.count;
    });
  }

  /**
   * Weeks of the month view. Each cell: { key, day, inMonth }.
   * @param {number} weekStart 0 = Sunday, 1 = Monday
   */
  function monthGrid(year, month, weekStart) {
    weekStart = weekStart || 0;
    var first = new Date(year, month, 1);
    var lead = (first.getDay() - weekStart + 7) % 7;
    var start = new Date(year, month, 1 - lead);
    var weeks = [];
    var cur = new Date(start);
    do {
      var week = [];
      for (var i = 0; i < 7; i++) {
        week.push({
          key: dateKeyOf(cur.getFullYear(), cur.getMonth(), cur.getDate()),
          day: cur.getDate(),
          inMonth: cur.getMonth() === month,
        });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    } while (cur.getMonth() === month && cur.getFullYear() === year);
    return weeks;
  }

  /** Shade level 0..4 for a day count, relative to the busiest visible day. */
  function intensityLevel(count, max) {
    if (!count) return 0;
    if (!max || max <= 1) return count > 0 ? 2 : 0;
    var r = count / max;
    if (r <= 0.25) return 1;
    if (r <= 0.5) return 2;
    if (r <= 0.75) return 3;
    return 4;
  }

  /** Stable string that changes whenever what the calendar shows changes. */
  function signature(index) {
    var parts = [];
    index.byDay.forEach(function (items, key) {
      parts.push(key + ':' + items.map(function (i) {
        return i.id + '@' + i.doneOn + '/' + i.path.join('>') + '/' + i.color;
      }).join(','));
    });
    (index.plannedByDay || new Map()).forEach(function (items, key) {
      parts.push('p' + key + ':' + items.map(function (i) {
        return i.id + '@' + i.due + '/' + i.path.join('>') + '/' + i.color;
      }).join(','));
    });
    parts.sort();
    parts.push(index.projects.map(function (p) {
      return p.id + '=' + p.title + '=' + p.color + '=' + p.total + '=' + p.plannedTotal;
    }).join(','));
    return parts.join('|');
  }

  var api = {
    NO_PROJECT_ID: NO_PROJECT_ID,
    toDateKey: toDateKey,
    dateKeyOf: dateKeyOf,
    isCountable: isCountable,
    plannedDateKey: plannedDateKey,
    buildIndex: buildIndex,
    filterItems: filterItems,
    countByProject: countByProject,
    monthGrid: monthGrid,
    intensityLevel: intensityLevel,
    signature: signature,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DailyReportLib = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
