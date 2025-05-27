// 存储当前鼠标位置
let currentMousePosition = { x: 0, y: 0 };
let lastHoveredElement = null;

// 监听鼠标移动，记录位置
document.addEventListener('mousemove', (e) => {
  currentMousePosition = { x: e.clientX, y: e.clientY };
  lastHoveredElement = e.target;
});

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'triggerWordContext') {
    handleWordContext();
  }
});

// 获取指定位置的文本元素
function getTextElementAtPosition(x, y) {
  const element = document.elementFromPoint(x, y);
  if (!element) return null;
  
  // 查找包含文本的元素
  let textElement = element;
  while (textElement && (!textElement.textContent || textElement.textContent.trim() === '')) {
    textElement = textElement.parentElement;
  }
  
  return textElement;
}

// 获取鼠标位置的单词
function getWordAtPosition(element, x, y) {
  const range = document.caretRangeFromPoint(x, y);
  if (!range) return '';
  
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) return '';
  
  const text = textNode.textContent;
  const offset = range.startOffset;
  
  // 找到单词边界
  let start = offset;
  let end = offset;
  
  // 向前找单词开始
  while (start > 0 && /[\w'-]/u.test(text[start - 1])) {
    start--;
  }
  
  // 向后找单词结束
  while (end < text.length && /[\w'-]/u.test(text[end])) {
    end++;
  }
  
  return text.substring(start, end);
}

// 获取段落文本
function getParagraphText(element, word) {
  // 查找最近的段落元素
  let paragraphContainer = element;
  const paragraphTags = ['P', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'ARTICLE', 'SECTION', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER'];
  
  while (paragraphContainer && !paragraphTags.includes(paragraphContainer.tagName)) {
    paragraphContainer = paragraphContainer.parentElement;
  }

  let text = '';

  if (paragraphContainer) {
    text = paragraphContainer.textContent || paragraphContainer.innerText || '';
  } else if (lastHoveredElement && lastHoveredElement.parentElement) {
    const parentText = lastHoveredElement.parentElement.textContent || lastHoveredElement.parentElement.innerText || '';
    if (parentText.trim().length > 0 && parentText.trim().length < 500) {
      text = parentText;
    } else {
      text = element.textContent || element.innerText || '';
    }
  } else {
    text = element.textContent || element.innerText || '';
  }
  
  // 清理文本（去除多余空格和换行）
  text = text.replace(/\s+/g, ' ').trim();
  
  // 如果文本太长（例如 > 300 字），尝试找到包含该单词的句子
  if (text.length > 300 && word) {
    const sentences = text.split(/[.!?]+/);
    for (let sentence of sentences) {
      sentence = sentence.trim();
      if (sentence.includes(word) && sentence.length > 0) {
        if (sentence.length > 150) {
          // 句子太长，尝试截取以单词为中心的部分
          const wordIndex = sentence.indexOf(word);
          const halfLength = Math.floor((150 - word.length) / 2);
          let start = Math.max(0, wordIndex - halfLength);
          let end = Math.min(sentence.length, wordIndex + word.length + halfLength);
          
          // 尝试扩展到完整的单词
          if (start > 0 && sentence[start-1].match(/\w/)) {
            while(start > 0 && sentence[start-1].match(/\w/)) start--;
          }
          if (end < sentence.length && sentence[end].match(/\w/)) {
            while(end < sentence.length && sentence[end].match(/\w/)) end++;
          }

          let finalSentence = sentence.substring(start, end);
          if (start > 0) finalSentence = "..." + finalSentence;
          if (end < sentence.length) finalSentence = finalSentence + "...";
          return finalSentence;
        }
        return sentence; // 返回找到的句子
      }
    }
  }
  
  // 最终长度上限
  if (text.length > 300) {
    text = text.substring(0, 300) + "...";
  }
  
  return text;
}

// 复制文本到剪切板
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('文本已复制到剪切板:', text);
    
    // 显示提示
    showNotification('已复制到剪切板！', text);
  } catch (err) {
    console.error('复制失败:', err);
    showNotification('复制失败！', '');
  }
}

// 显示通知
function showNotification(title, content) {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 400px;
    word-wrap: break-word;
  `;
  
  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
    <div style="font-size: 12px; opacity: 0.9;">${content}</div>
  `;
  
  document.body.appendChild(notification);
  
  // 3秒后移除通知
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// 主处理函数
function handleWordContext() {
  const element = getTextElementAtPosition(currentMousePosition.x, currentMousePosition.y);
  if (!element) {
    console.log('未找到文本元素');
    showNotification('错误', '未能识别当前位置的文本元素。');
    return;
  }
  
  // 获取单词
  const word = getWordAtPosition(element, currentMousePosition.x, currentMousePosition.y);
  if (!word) {
    console.log('未找到单词');
    showNotification('错误', '未能在当前位置找到有效单词。');
    return;
  }
  
  // 获取段落
  const paragraph = getParagraphText(element, word);
  if (!paragraph) {
    console.log('未找到段落');
    showNotification('错误', '未能提取当前单词的上下文段落。');
    return;
  }
  
  // 组合句子
  const question = `What does \`${word}\` mean in \`${paragraph}\`?`;
  
  console.log('生成的问题:', question);
  
  // 复制到剪切板
  copyToClipboard(question);
}

console.log('Word Context Helper 已加载');