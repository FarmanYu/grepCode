/**
 * grep-Commander Online - 前端脚本
 * 支持代码高亮和查看完整源代码
 */

$(document).ready(function() {
  'use strict';
  
  // DOM 元素
  var $word = $('#word');
  var $files = $('#files');
  var $number = $('#number');
  var $project = $('#project');
  var $ignoreCase = $('#ignoreCase');
  var $button = $('#start-query');
  var $content = $('#code-content');
  var $modalOverlay = $('#modal-overlay');
  var $modalTitle = $('#modal-title');
  var $modalCode = $('#modal-code');
  var $modalClose = $('#modal-close');
  
  var isPending = false;
  
  // 初始化
  $word.focus();
  
  // 模态框事件
  $modalClose.on('click', closeModal);
  $modalOverlay.on('click', function(e) {
    if (e.target === this) closeModal();
  });
  $(document).on('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });
  
  /**
   * 关闭模态框
   */
  function closeModal() {
    $modalOverlay.removeClass('active');
  }
  
  /**
   * 打开模态框
   */
  function openModal(title, codeHtml) {
    $modalTitle.text(title);
    $modalCode.html(codeHtml);
    $modalOverlay.addClass('active');
  }
  
  /**
   * 显示加载中
   */
  function showLoading() {
    $content.html(
      '<div class="loading">' +
        '<div class="loading-spinner"></div>' +
        '<p>正在搜索...</p>' +
      '</div>'
    );
  }
  
  /**
   * 显示空状态
   */
  function showEmpty(message) {
    $content.html(
      '<div class="results-empty">' +
        '<i class="fas fa-code"></i>' +
        '<p>' + (message || '输入关键词开始搜索代码...') + '</p>' +
      '</div>'
    );
  }
  
  /**
   * 显示错误
   */
  function showError(message) {
    $content.html(
      '<div class="results-empty" style="color: var(--accent-error);">' +
        '<i class="fas fa-exclamation-triangle"></i>' +
        '<p>' + message + '</p>' +
      '</div>'
    );
  }
  
  /**
   * HTML转义 - 必须先转义再highlight，防止XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    var map = { 
      '&': '&amp;', 
      '<': '&lt;', 
      '>': '&gt;', 
      '"': '&quot;', 
      "'": '&#039;' 
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }
  
  /**
   * 高亮搜索关键词 - 在转义后的代码中标记关键词
   */
  function highlightKeyword(escapedCode, keyword) {
    if (!keyword || !escapedCode) return escapedCode;
    
    // 转义正则特殊字符
    var escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 创建正则，忽略大小写
    var regex = new RegExp('(' + escapedKeyword + ')', 'gi');
    
    // 替换为高亮标签（注意不要替换已经转义的HTML实体）
    return escapedCode.replace(regex, '<span class="search-highlight">$1</span>');
  }
  
  /**
   * 安全的高亮函数 - 先转义再高亮
   */
  function safeHighlight(code, lang) {
    // 1. 先转义 HTML
    var escaped = escapeHtml(code);
    
    // 2. 使用 textContent 防止执行
    var $code = $('<code class="hljs language-' + lang + '"></code>');
    $code.text(code);  // 使用 textContent，不是 html()
    
    // 3. 使用 highlightElement（它会处理高亮但保持安全）
    try {
      hljs.highlightElement($code[0]);
    } catch (e) {
      console.warn('Highlight error:', e);
    }
    
    return $code;
  }
  
  /**
   * 格式化文件大小
   */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  /**
   * 查看完整源码
   */
  function viewFullSource(filenameOrPath, suffix, basePath) {
    // 如果是完整路径直接使用，否则拼接
    var fullPath = (filenameOrPath && filenameOrPath.startsWith('/')) 
      ? filenameOrPath 
      : (basePath ? basePath + '/' + filenameOrPath : filenameOrPath);
    
    // 显示加载中模态框
    openModal('加载中...', '<div class="loading"><div class="loading-spinner"></div></div>');
    
    $.get('/readfile', { 
      path: fullPath
    })
    .done(function(res) {
      if (res.code === 0 && res.data) {
        var data = res.data;
        
        // 安全处理：使用 textContent 而不是 html()
        var $codeBlock = $('<code class="hljs language-' + data.language + '"></code>');
        $codeBlock.text(data.content);  // 关键：防止 XSS
        
        // 高亮
        try {
          hljs.highlightElement($codeBlock[0]);
        } catch (e) {
          console.warn('Highlight error:', e);
        }
        
        var info = '<div style="padding: 12px 24px; background: #16161f; border-bottom: 1px solid #2a2a3a; color: #94a3b8; font-size: 0.85rem;">' +
          '<i class="fas fa-file-code-o"></i> ' + data.filename + ' | ' +
          formatSize(data.size) + ' | ' + data.lines + ' 行' +
          '</div>';
        
        openModal(data.filename, info + $('<div>').append($codeBlock.clone()).html());
      } else {
        openModal('错误', '<div class="results-empty" style="color: var(--accent-error);"><i class="fas fa-times-circle"></i><p>' + res.message + '</p></div>');
      }
    })
    .fail(function(xhr) {
      openModal('错误', '<div class="results-empty" style="color: var(--accent-error);"><i class="fas fa-times-circle"></i><p>加载失败: ' + xhr.statusText + '</p></div>');
    });
  }
  
  /**
   * 渲染搜索结果
   */
  function renderResults(data) {
    var currentKeyword = $word.val().trim();
    
    $content.empty();
    
    if (!data || data.length === 0) {
      showEmpty('未找到匹配结果');
      return;
    }
    
    // 结果计数
    $content.append(
      '<div class="results-count">' +
        '<i class="fas fa-check-circle"></i> 找到 ' + data.length + ' 个匹配结果' +
      '</div>'
    );
    
    // 渲染每个结果
    data.forEach(function(item, index) {
      var lang = item.suffix || 'plaintext';
      var codeText = item.code.join('\n');
      var lineNum = item.number[0] || 1;
      
      // 先转义 HTML
      var escapedCode = escapeHtml(codeText);
      
      // 高亮搜索关键词
      if (currentKeyword) {
        escapedCode = highlightKeyword(escapedCode, currentKeyword);
      }
      
      var $result = $(
        '<div class="code-result">' +
          '<div class="code-header">' +
            '<div class="code-filename">' +
              '<i class="fas fa-file-code"></i> ' +
              '<span>' + escapeHtml(item.filename) + '</span> ' +
              '<span class="ext">.' + escapeHtml(lang) + '</span>' +
            '</div>' +
            '<div class="code-actions">' +
              '<a href="javascript:void(0)" class="code-action btn-view-source" data-filename="' + escapeHtml(item.filename) + '" data-fullpath="' + escapeHtml(item.fullPath) + '" data-suffix="' + escapeHtml(lang) + '">' +
                '<i class="fas fa-eye"></i> 查看源码' +
              '</a>' +
            '</div>' +
          '</div>' +
          '<div class="code-fullpath">' + escapeHtml(item.fullPath) + '</div>' +
          '<div class="code-body">' +
            '<pre><code class="hljs language-' + lang + '">' + escapedCode + '</code></pre>' +
          '</div>' +
        '</div>'
      );
      
      // 绑定查看源码事件 - 使用完整路径
      $result.find('.btn-view-source').on('click', function() {
        viewFullSource(item.fullPath || (item.filename), lang, '');
      });
      
      $content.append($result);
    });
  }
  
  /**
   * 执行搜索
   */
  function doSearch() {
    var word = $word.val();
    
    if (!word || !word.trim()) {
      showError('请输入搜索关键词');
      $word.focus();
      return;
    }
    
    if (isPending) return;
    
    isPending = true;
    $button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> 搜索中...');
    showLoading();
    
    var data = {
      word: word.trim(),
      files: $files.val(),
      number: $number.val(),
      path: $project.val(),
      ignoreCase: $ignoreCase.is(':checked')
    };
    
    $.get('/cmdparse?t=' + Date.now(), data)
      .done(function(res) {
        if (res.code === 0) {
          renderResults(res.data);
        } else {
          showError(res.message);
        }
      })
      .fail(function(xhr) {
        showError('请求失败: ' + (xhr.statusText || '网络错误'));
      })
      .always(function() {
        isPending = false;
        $button.prop('disabled', false).html('<i class="fas fa-search"></i> 搜索代码');
      });
  }
  
  // 事件绑定
  $button.on('click', doSearch);
  
  $word.on('keypress', function(e) { if (e.which === 13) doSearch(); });
  $files.on('keypress', function(e) { if (e.which === 13) doSearch(); });
  $number.on('keypress', function(e) { if (e.which === 13) doSearch(); });
  
  // 双击清空
  $content.on('dblclick', function() {
    $content.find('.results-empty').remove();
    showEmpty();
  });
  
  console.log('grep-Commander initialized');
});