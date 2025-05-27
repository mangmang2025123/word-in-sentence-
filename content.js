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
  while (start > 0 && /\w/.test(text[start - 1])) {
    start--;
  }
  
  // 向后找单词结束
  while (end < text.length && /\w/.test(text[end])) {
    end++;
  }
  
  return text.substring(start, end);
}

// 获取段落文本
function getParagraphText(element) {
  // 查找最近的段落元素
  let paragraph = element;
  const paragraphTags = ['P', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH'];
  
  while (paragraph && !paragraphTags.includes(paragraph.tagName)) {
    paragraph = paragraph.parentElement;
  }
  
  if (!paragraph) {
    // 如果找不到段落元素，使用当前元素
    paragraph = element;
  }
  
  // 获取纯文本内容
  let text = paragraph.textContent || paragraph.innerText || '';
  
  // 清理文本（去除多余空格和换行）
  text = text.replace(/\s+/g, ' ').trim();
  
  // 如果文本太长，尝试找到包含鼠标位置的句子
  if (text.length > 200) {
    const sentences = text.split(/[.!?]+/);
    const mouseText = getWordAtPosition(element, currentMousePosition.x, currentMousePosition.y);
    
    for (let sentence of sentences) {
      if (sentence.includes(mouseText) && sentence.trim().length > 0) {
        return sentence.trim();
      }
    }
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
    return;
  }
  
  // 获取单词
  const word = getWordAtPosition(element, currentMousePosition.x, currentMousePosition.y);
  if (!word) {
    console.log('未找到单词');
    return;
  }
  
  // 获取段落
  const paragraph = getParagraphText(element);
  if (!paragraph) {
    console.log('未找到段落');
    return;
  }
  
  // 组合句子
  const question = `What does \`${word}\` mean in \`${paragraph}\`?`;
  
  console.log('生成的问题:', question);
  
  // 复制到剪切板
  copyToClipboard(question);
}

// 监听键盘事件（备用方案）
document.addEventListener('keydown', (e) => {
  // 这里可以作为备用的快捷键监听
  if (e.key === 'F9' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    e.preventDefault();
    handleWordContext();
  }
});

console.log('Word Context Helper 已加载');