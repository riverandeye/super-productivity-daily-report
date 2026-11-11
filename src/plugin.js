// Daily Report: host-side entry points. The UI lives in index.html.
// The app adds a menu entry for the iframe view on its own; this adds a
// header button and a (user-assignable) keyboard shortcut.
PluginAPI.registerHeaderButton({
  label: 'Daily Report',
  icon: 'event_available',
  onClick: function () {
    PluginAPI.showIndexHtmlAsView();
  },
});

PluginAPI.registerShortcut({
  id: 'open_done_calendar',
  label: 'Daily Report 열기',
  onExec: function () {
    PluginAPI.showIndexHtmlAsView();
  },
});
