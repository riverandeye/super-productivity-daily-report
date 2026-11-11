# Daily Report — a Super Productivity plugin

A [Super Productivity](https://github.com/super-productivity/super-productivity) plugin that shows the tasks and subtasks you **checked off each day** on a monthly calendar.
Unlike the built-in History view, which is based on tracked time, it answers "what did I finish that day?" — and, optionally, "what did I plan for that day?".

- Requires Super Productivity **v20.0.0 or later** (tested on desktop)
- Install file: [`release/daily-report-1.2.0.zip`](release/daily-report-1.2.0.zip)

## Features

- **Monthly calendar**: each day shows how many tasks and subtasks you completed.
  - The cell is tinted with the color of that day's busiest project, and busier days are darker (4 levels, relative to the busiest day of the month).
  - The bar and dots at the bottom of a cell show the count per project.
  - `‹` / `›` (or the ← / → keys) move to the previous / next month; **Today** jumps back to today.
  - The header shows how many items you completed this month and on how many days.
- **Day details**: click a day to list what you completed, in completion order, as `Project › Parent task › Subtask` with the time you checked it off.
  Example: `Learn English › Finish reading textbook › Unit 2 · Inference`
- **Done / Planned / Both**: the switch next to **Today** picks what the calendar shows.
  - **Done**: tasks you checked off, by completion date.
  - **Planned**: unfinished tasks, by the day they are planned for (dashed cells).
  - **Both** (default): done counts and shading, plus a dashed `○N` badge for planned items. The day panel lists **Done** and **Planned** separately.
  - Planned items on past days are still unfinished, so they are marked **Overdue** (red).
- **Project filter**: click the chips at the top to show or hide projects (several at once). **All** clears the filter. The number on each chip is that project's total over all time (done, planned, or `done/planned` in Both).
- **Opening it**
  - The **Daily Report** entry in the left menu (added by the app)
  - The calendar icon button in the header
  - A keyboard shortcut: assign one to "Open Daily Report" under Settings → Keyboard Shortcuts → Plugin Shortcuts
- **Language**: follows the app language (English and Korean; other languages fall back to English). Month, weekday, date and time labels use that language's format.
- **Live updates**: redraws when tasks are completed, edited or deleted, when projects change, after sync (`dataChanged` hook), and when the day changes.

## Install

1. In the app, open **Settings → Plugins → Install Plugin** ("Choose Plugin File" on some versions).
2. Pick `release/daily-report-1.2.0.zip` and confirm the trust warning.
3. Uploaded plugins are **installed disabled**. Turn on the toggle next to **Daily Report** in the plugin list; the left-menu entry and the header button appear after that.

Uploading again with the same `id` (`daily-report`) replaces the installed version.

## What counts

- Tasks come from `PluginAPI.getTasks()` (active) and `getArchivedTasks()` (archived), merged. If a task is in both, the active copy wins.
- Only tasks with `isDone: true` and a `doneOn` timestamp are counted. **Tasks closed as "won't do" are left out.**
- `doneOn` is converted to a local date. If you changed the app's "start of next day" setting (e.g. 4 a.m.), that offset is applied, so a task checked off at 1 a.m. counts for the previous day (on versions that provide `getDayContext()`).
- Parent tasks and subtasks are **each counted once**. If finishing the last subtask also completes the parent, both appear on that day.
- Project names and colors come from `getAllProjects()` (`title`, `theme.primary`). Tasks without a project show as "No project", and archived tasks of a deleted project as "(deleted project)".
- **Planned** items are active (not archived) tasks that are not done and have a scheduled time (`dueWithTime`) or a planned day (`dueDay`, which is what Today, the Planner and "schedule" set). A scheduled time wins over the day. Timed items come first, by time; the rest show "Any time".
- The plugin only reads data. It never changes anything and sends nothing off the device.

## Limitations

- **Unchecking a task clears its `doneOn`, and checking it again sets a new date.** The app keeps no completion history, so a task you finished long ago and accidentally uncheck and re-check moves to today.
- Deleted tasks disappear from the calendar (archived ones stay).
- Each occurrence of a repeating task is a separate task and is counted separately.
- Future occurrences of repeating tasks are created by the app only when they are due, so they don't show as planned in advance.
- Weeks start on Sunday.

## Development

No dependencies: only Node.js (18+) and the system `zip` command.

```bash
npm test        # unit tests for src/lib.js (node:test)
npm run build   # writes dist/ and release/daily-report-<version>.zip
```

| File | Purpose |
| --- | --- |
| `src/manifest.json` | Plugin metadata (`iFrame: true`, `minSupVersion: 20.0.0`) |
| `src/plugin.js` | Registers the header button and shortcut (runs in the app renderer) |
| `src/index.html` | Calendar UI (iframe). `lib.js` and the English strings are inlined at build time |
| `src/i18n/*.json` | Translations (en, ko). To add a language, add a file and list it in the manifest's `i18n.languages` |
| `src/lib.js` | Date conversion, indexing and grid math (no DOM; covered by tests) |
| `scripts/build.mjs` | Build and ZIP script |

Iframe plugins are not served the other files in the ZIP, so the build inlines `lib.js` into `index.html`.
To release a new version, bump `version` in `src/manifest.json` and rebuild.

## License

MIT — see [LICENSE](LICENSE)
