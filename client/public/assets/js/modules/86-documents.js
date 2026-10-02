/* Documents registry: live metadata and version history, using the shared authenticated API. */
(function () {
  'use strict';

  var rows = [];
  var total = 0;
  var pages = 1;
  var page = 1;
  var history = false;
  var loading = false;
  var loaded = false;
  var error = '';
  var activeRequest = 0;
  var pendingPublish = false;

  function safe(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function canPublish() {
    var adapter = window.SCHOOLOS_ADAPTER;
    return !!(adapter && adapter.user && ['Administrator', 'Principal', 'Teacher'].indexOf(adapter.user.role) >= 0);
  }

  function api() {
    var adapter = window.SCHOOLOS_ADAPTER;
    if (!adapter || !adapter.connected) return null;
    return adapter.api;
  }

  function refresh() {
    var request = api();
    if (!request) return;
    var requestId = ++activeRequest;
    loading = true;
    error = '';
    request('/documents?page=' + page + '&limit=20&includeSuperseded=' + history)
      .then(function (response) {
        if (requestId !== activeRequest) return;
        rows = response.data || [];
        var pagination = response.meta && response.meta.pagination;
        total = pagination ? pagination.total : rows.length;
        pages = pagination ? Math.max(1, pagination.totalPages) : 1;
        loaded = true;
      })
      .catch(function (failure) {
        if (requestId === activeRequest) error = failure.message || 'Documents could not be loaded';
      })
      .finally(function () {
        if (requestId !== activeRequest) return;
        loading = false;
        if (state.module === 'documents') render();
      });
  }

  window.documentHistory = function (checked) { history = !!checked; page = 1; loaded = false; refresh(); render(); };
  window.documentPage = function (next) {
    if (next < 1 || next > pages) return;
    page = next; loaded = false; refresh(); render();
  };
  window.documentReload = function () { loaded = false; refresh(); render(); };

  window.documentDetail = function (index) {
    var doc = rows[index];
    if (!doc) return;
    openDrawer(detailDrawer({
      title: safe(doc.title),
      sub: safe(doc.code) + ' · version ' + doc.version,
      color: '#0E7C39',
      badge: ic('docs', 18),
      sections: [
        { h: 'Record', rows: [['Code', safe(doc.code)], ['Category', safe(doc.category)], ['Version', 'v' + doc.version], ['Status', doc.isCurrent ? 'Current' : 'Superseded']] },
        { h: 'Summary', html: '<div class="card pad" style="white-space:pre-wrap;overflow-wrap:anywhere">' + safe(doc.description) + '</div>' },
        { h: 'File', html: doc.fileId
          ? '<button class="btn sm primary" onclick="documentDownload(' + index + ')">' + ic('download', 14) + ' Download PDF</button><span class="muted" style="margin-left:8px;font-size:12px">' + safe(doc.filename || '') + '</span>'
          : '<p class="muted" style="font-size:12px">No PDF attached to this registry record.</p>' }
      ],
      footer: [['Close', 'closeDrawer()', true]]
    }));
  };

  window.documentDownload = function (index) {
    var doc = rows[index];
    var adapter = window.SCHOOLOS_ADAPTER;
    if (!doc || !doc.fileId || !adapter || !adapter.token) return;
    var base = (window.SCHOOLOS_API && window.SCHOOLOS_API.base) || 'http://localhost:4000/api/v1';
    function requestFile() {
      return fetch(base + '/documents/' + encodeURIComponent(doc._id) + '/file', {
        headers: { Authorization: 'Bearer ' + adapter.token }
      });
    }
    requestFile().then(function (response) {
      if (response.status === 401) return adapter.api('/auth/me').then(requestFile);
      return response;
    }).then(function (response) {
      if (!response.ok) throw new Error('Download failed (' + response.status + ')');
      return response.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = doc.filename || (doc.code + '.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }).catch(function (failure) { toast(failure.message); });
  };

  window.documentPublishForm = function () {
    if (!canPublish()) return;
    formDrawer('Publish document', 'Upload a PDF with the record, or save metadata only for an existing paper document', [
      { label: 'Code (e.g. POL-001)', key: 'code', req: true },
      { label: 'Title', key: 'title', req: true },
      { label: 'Category', key: 'category', opts: ['Policy', 'Form', 'Circular', 'Guideline'], req: true },
      { label: 'Summary', key: 'description', area: true, req: true, maxlen: 2000 }
    ], 'Publish record', '', 'documentPublish');
    var form = document.querySelector('#drawer .form-body');
    if (form) form.insertAdjacentHTML('beforeend', '<label class="ffull" style="display:block;margin-bottom:13px"><span style="font-size:12.5px;font-weight:600;color:var(--slate-600);display:block;margin-bottom:5px">PDF file (optional, up to 8 MB)</span><input id="documentPdfFile" type="file" accept="application/pdf,.pdf" style="width:100%"></label>');
  };

  window.documentPublish = function (values) {
    if (!canPublish() || !api()) { toast('You cannot publish document records'); return false; }
    if (pendingPublish) return false;
    var input = {
      code: String(values.code || '').trim().toUpperCase(),
      title: String(values.title || '').trim(),
      category: values.category,
      description: String(values.description || '').trim()
    };
    if (!/^[A-Z]{2,5}-[0-9]{2,5}$/.test(input.code)) { toast('Code must look like POL-001'); return false; }
    if (input.title.length < 2 || !input.description || input.description.length > 2000) {
      toast('Enter a title and a summary of up to 2000 characters'); return false;
    }
    var fileInput = document.getElementById('documentPdfFile');
    var file = fileInput && fileInput.files && fileInput.files[0];
    if (file && (file.type !== 'application/pdf' || file.size > 8 * 1024 * 1024 || !file.size)) {
      toast('Choose a PDF no larger than 8 MB'); return false;
    }
    pendingPublish = true;
    var button = document.querySelector('#drawer .df .btn.primary');
    if (button) button.disabled = true;
    var operation = file
      ? file.arrayBuffer().then(function (body) {
          return api()('/documents/file', { method: 'POST', headers: {
            'Content-Type': 'application/pdf',
            'X-File-Name': encodeURIComponent(file.name),
            'X-Document-Code': encodeURIComponent(input.code),
            'X-Document-Title': encodeURIComponent(input.title),
            'X-Document-Category': encodeURIComponent(input.category),
            'X-Document-Description': encodeURIComponent(input.description)
          }, body: body });
        })
      : api()('/documents', { method: 'POST', body: JSON.stringify(input) });
    operation
      .then(function (response) {
        closeDrawer();
        page = 1; loaded = false; refresh();
        toast('Published ' + response.data.code + ' v' + response.data.version);
      })
      .catch(function (failure) { toast('Not published — ' + failure.message); })
      .finally(function () { pendingPublish = false; if (button) button.disabled = false; });
    return false;
  };

  M.documents = function () {
    if (!loaded && !loading && !error) setTimeout(refresh, 0);
    var content = error
      ? '<div class="card pad" role="alert">' + safe(error) + ' <button class="btn sm" onclick="documentReload()">Retry</button></div>'
      : loading && !loaded ? '<div class="card pad muted">Loading documents…</div>'
      : '<div class="card pad"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Code</th><th>Title</th><th>Category</th><th class="right">Version</th>' +
        (history ? '<th>Status</th>' : '') + '<th>Summary</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (doc, index) {
          return '<tr style="cursor:pointer" onclick="documentDetail(' + index + ')" tabindex="0" onkeydown="if(event.key===\'Enter\')documentDetail(' + index + ')"><td class="num">' +
            safe(doc.code) + '</td><td style="font-weight:600;color:var(--slate-900)">' + safe(doc.title) + '</td><td>' +
            safe(doc.category) + '</td><td class="right num">v' + doc.version + '</td>' +
            (history ? '<td>' + (doc.isCurrent ? 'Current' : 'Superseded') + '</td>' : '') +
            '<td>' + safe(String(doc.description || '').slice(0, 80)) + '</td></tr>';
        }).join('') : '<tr><td colspan="' + (history ? 6 : 5) + '" class="muted" style="text-align:center;padding:28px">No document records published yet.</td></tr>') +
        '</tbody></table></div></div>';
    return '<div class="page-head"><div class="ph-l"><h2>Documents</h2><p>Policies, forms, circulars and guidelines — current records and version history.</p></div>' +
      (canPublish() ? '<div class="ph-r"><button class="btn primary" onclick="documentPublishForm()">' + ic('plus', 16) + ' Publish record</button></div>' : '') +
      '</div><p class="muted" style="font-size:12px;margin-bottom:14px">Versioned document records with optional PDFs. Digital signatures are not available.</p>' +
      '<div class="grid cols-2" style="margin-bottom:18px">' +
      kpi('docs', '#0E7C39', history ? 'All versions' : 'Current records', String(total), null) +
      kpi('curric', '#2563EB', 'Categories on this page', String(new Set(rows.map(function (d) { return d.category; })).size), null) +
      '</div><label style="display:block;margin-bottom:14px;font-size:12.5px"><input type="checkbox" ' + (history ? 'checked ' : '') +
      'onchange="documentHistory(this.checked)"> Show superseded versions</label>' + content +
      '<div class="flex ac jb" style="margin-top:14px"><span class="muted">Page ' + page + ' of ' + pages + ' · ' + total + ' total</span>' +
      '<div class="flex ac" style="gap:8px"><button class="btn sm" ' + (page <= 1 ? 'disabled' : '') +
      ' onclick="documentPage(' + (page - 1) + ')">Previous</button><button class="btn sm" ' + (page >= pages ? 'disabled' : '') +
      ' onclick="documentPage(' + (page + 1) + ')">Next</button></div></div>';
  };
}());
