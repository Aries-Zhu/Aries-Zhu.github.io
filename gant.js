// ===== 现代化甘特图核心逻辑 =====

// 全局数据
let resources = [];
let dates = [];
let orders = [];
let draggedBar = null;
let originalOrder = null;
const API_BASE_URL = 'http://localhost:3003';

// ===== 工具函数 =====
function dateIndex(date) {
  return dates.findIndex(d => d === date);
}

function generateDateRange(start, end) {
  const dateArray = [];
  let currentDate = new Date(start);
  const endDate = new Date(end);
  
  while (currentDate <= endDate) {
    dateArray.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dateArray;
}

function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateTime(date) {
  return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ===== 统计信息更新 =====
function updateStats() {
  const resourceCount = resources.length;
  const orderCount = orders.length;
  const dateRange = dates.length > 0 ? `${dates.length}天` : '0天';
  
  const resourceCountEl = document.getElementById('resourceCount');
  const taskCountEl = document.getElementById('taskCount');
  const dateRangeEl = document.getElementById('dateRange');
  
  if (resourceCountEl) resourceCountEl.textContent = resourceCount;
  if (taskCountEl) taskCountEl.textContent = orderCount;
  if (dateRangeEl) dateRangeEl.textContent = dateRange;
}

// ===== 甘特图绘制 =====
function drawGantt() {
  console.log("开始绘制现代化甘特图...");
  
  const resourceBody = document.getElementById('resourceBody');
  const dateTable = document.getElementById('dateTable');
  
  // 清空内容
  if (resourceBody) resourceBody.innerHTML = '';
  if (dateTable) dateTable.innerHTML = '';
  
  if (resources.length === 0 || dates.length === 0) {
    showStatusMessage('暂无数据，请添加资源或订单', 'warning');
    return;
  }

  // 生成完整的日期范围
  const startDate = dates[0];
  const endDate = dates[1];
  const dateRange = generateDateRange(startDate, endDate);
  
  // 创建资源表格内容
  if (resourceBody) {
    resourceBody.innerHTML = '';
    resources.forEach(resource => {
      let tr = `<tr class="gantt-row"><td class="resource-label">${resource}</td></tr>`;
      resourceBody.innerHTML += tr;
    });
  }

  // 创建日期表格（包含标题和内容）
  let tableHTML = `<thead><tr>`;
  dateRange.forEach(d => tableHTML += `<th>${formatDateDisplay(d)}</th>`);
  tableHTML += `</tr></thead><tbody>`;
  
  // 创建日期表格内容行
  resources.forEach((resource, resourceIndex) => {
    tableHTML += `<tr class="gantt-row">`;
    for (let i = 0; i < dateRange.length; i++) {
      tableHTML += `<td></td>`;
    }
    tableHTML += `</tr>`;
  });
  tableHTML += `</tbody>`;
  
  if (dateTable) dateTable.innerHTML = tableHTML;

  // 绘制甘特条
  setTimeout(() => {
    drawGanttBars(dateRange);
    updateStats();
  }, 100);
}

// ===== 颜色映射系统 =====
function getTaskColor(taskInfo, resource, orderColor) {
  // 如果有指定的颜色，优先使用
  if (orderColor && orderColor !== '') {
    return orderColor;
  }
  
  // 生成随机颜色（作为后备方案）
  const colors = [
    'rgb(59, 130, 246)',   // 蓝色
    'rgb(16, 185, 129)',   // 绿色
    'rgb(139, 92, 246)',   // 紫色
    'rgb(245, 158, 11)',   // 橙色
    'rgb(239, 68, 68)',    // 红色
    'rgb(6, 182, 212)',    // 青色
    'rgb(132, 204, 22)',   // 黄绿
    'rgb(236, 72, 153)',   // 粉色
    'rgb(168, 85, 247)',   // 紫罗兰
    'rgb(249, 115, 22)',   // 橙黄
    'rgb(34, 197, 94)',    // 翠绿
    'rgb(14, 165, 233)'    // 天蓝
  ];
  
  // 根据任务名称生成hash来选择颜色
  const hash = taskInfo.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

// ===== 绘制甘特条 =====
function drawGanttBars(dateRange) {
  // 清除现有甘特条
  document.querySelectorAll('.gantt-bar').forEach(bar => bar.remove());
  
  const cellWidth = 80; // 单元格宽度
  const cellHeight = 50; // 单元格高度
  
  orders.forEach((order, index) => {
    const resourceIndex = resources.indexOf(order.resource);
    if (resourceIndex === -1) return;

    const startIndex = dateRange.indexOf(order.starttime);
    const endIndex = dateRange.indexOf(order.endtime);
    
    if (startIndex === -1 || endIndex === -1) return;

    const duration = endIndex - startIndex + 1;
    
    // 计算位置和尺寸 - 基于日期表格
    const left = startIndex * cellWidth + 2; // 从第一个日期列开始
    const width = Math.max(duration * cellWidth - 4, cellWidth - 4); // 留出边距
    const top = resourceIndex * cellHeight + 52; // 考虑表头高度 + 边距（thead高度50px + 2px边距）

    const bar = document.createElement('div');
    bar.className = 'gantt-bar';
    bar.draggable = true;
    
    // 直接使用订单指定的颜色
    const color = order.color || getTaskColor(order.display_info, order.resource);
    
    // 设置样式
    bar.style.backgroundColor = color;
    bar.style.left = left + 'px';
    bar.style.width = width + 'px';
    bar.style.top = top + 'px';
    bar.style.height = '46px';
    bar.style.lineHeight = '46px';
    bar.style.zIndex = '100';
    bar.style.position = 'absolute';
    
    // 设置内容，添加颜色标识
    bar.innerHTML = `
      <span class="gantt-bar-text" style="padding: 0 8px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${order.display_info}</span>
      <span class="gantt-bar-resource" style="font-size: 0.6rem; opacity: 0.8; margin-left: 4px;">${order.resource.split('-')[0]}</span>
    `;
    bar.title = `${order.display_info} (${order.starttime} - ${order.endtime})`;
    
    // 存储订单数据
    order.resource = resources[resourceIndex]; // 添加资源信息
    bar.dataset.order = JSON.stringify(order);
    bar.dataset.orderId = order.OrderCode;
    bar.dataset.color = color;
    
    // 添加事件监听器
    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      showTaskDetails(order);
    });
    bar.addEventListener('dragstart', handleDragStart);
    bar.addEventListener('dragend', handleDragEnd);
    
    // 添加到日期表格容器，确保正确的定位上下文
    const dateColumn = document.querySelector('.date-column');
    if (dateColumn) {
      dateColumn.style.position = 'relative'; // 确保相对定位
      dateColumn.appendChild(bar);
    }
  });
}

// ===== 创建甘特条 =====
function createGanttBar(order, startCell, endCell, row) {
  const bar = document.createElement('div');
  bar.className = 'gantt-bar';
  bar.draggable = true;
  
  // 设置样式和内容
  bar.style.backgroundColor = order.color || '#2563eb';
  bar.style.left = `${startCell.offsetLeft}px`;
  bar.style.width = `${endCell.offsetLeft + endCell.offsetWidth - startCell.offsetLeft - 4}px`;
  bar.style.top = `${row.offsetTop + 7}px`;
  
  // 显示任务名称和进度
  const progress = order.info ? order.info.match(/进度:(\d+)%/)?.[1] || '0' : '0';
  bar.innerHTML = `
    <span class="gantt-bar-text">${order.name}</span>
    <span class="gantt-bar-progress">${progress}%</span>
  `;
  
  // 存储订单数据
  bar.dataset.order = JSON.stringify(order);
  bar.dataset.orderId = order.id;
  
  // 添加事件监听器
  bar.addEventListener('dragstart', handleDragStart);
  bar.addEventListener('dragend', handleDragEnd);
  bar.addEventListener('click', () => openTaskModal(order));
  bar.addEventListener('dblclick', () => openTaskFormModal(order));
  
  return bar;
}

// ===== 拖拽事件处理 =====
function handleDragStart(e) {
  draggedBar = e.target;
  originalOrder = JSON.parse(draggedBar.dataset.order);
  
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', e.target.dataset.orderId);
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  
  if (draggedBar && originalOrder) {
    // 检查是否移动到新资源或日期
    const newOrder = checkBarPosition(e.target);
    if (newOrder && (newOrder.resource !== originalOrder.resource || newOrder.start !== originalOrder.start)) {
      updateOrder(newOrder);
    }
  }
  
  draggedBar = null;
  originalOrder = null;
}

// ===== 检查甘特条新位置 =====
function checkBarPosition(bar) {
  const rect = bar.getBoundingClientRect();
  const dateColumn = document.querySelector('.date-column');
  const columnRect = dateColumn.getBoundingClientRect();
  
  // 计算相对位置
  const relativeX = rect.left - columnRect.left + dateColumn.scrollLeft;
  const relativeY = rect.top - columnRect.top;
  
  // 找到对应的资源和日期
  const cellWidth = 80; // 与CSS中的min-width匹配
  const cellHeight = 50;
  
  const colIndex = Math.floor(relativeX / cellWidth);
  const rowIndex = Math.floor(relativeY / cellHeight);
  
  if (rowIndex >= 0 && rowIndex < resources.length && colIndex >= 0 && colIndex < dates.length) {
    const order = JSON.parse(bar.dataset.order);
    const newResource = resources[rowIndex];
    const newStart = dates[colIndex];
    const newEnd = dates[Math.min(colIndex + (dateIndex(order.end) - dateIndex(order.start)), dates.length - 1)];
    
    return {
      ...order,
      resource: newResource,
      start: newStart,
      end: newEnd
    };
  }
  
  return null;
}

// ===== 订单事件处理 =====




// ===== 保存订单 =====
function saveOrder() {
  const form = document.getElementById('editOrderForm');
  const orderId = document.getElementById('editOrderId').value;
  const existingOrder = orders.find(o => o.OrderCode === orderId);
  
  const order = {
    OrderCode: orderId,
    display_info: document.getElementById('editOrderName').value,
    resource: document.getElementById('editOrderResource').value,
    starttime: document.getElementById('editOrderStart').value,
    endtime: document.getElementById('editOrderEnd').value,
    color: existingOrder?.color || getTaskColor(document.getElementById('editOrderName').value, document.getElementById('editOrderResource').value)
  };
  
  // 验证数据
  if (!order.display_info || !order.resource || !order.starttime || !order.endtime) {
    showStatusMessage('请填写完整信息', 'error');
    return;
  }
  
  if (new Date(order.starttime) > new Date(order.endtime)) {
    showStatusMessage('开始日期不能晚于结束日期', 'error');
    return;
  }
  
  // 更新或添加订单
  const existingIndex = orders.findIndex(o => o.OrderCode === order.OrderCode);
  if (existingIndex >= 0) {
    orders[existingIndex] = order;
  } else {
    orders.push(order);
  }
  
  closeEditModal();
  drawGantt();
  saveDataToServer();
  showStatusMessage('任务保存成功', 'success');
}

// ===== 删除订单 =====
function deleteOrder() {
  const orderId = document.getElementById('editOrderId').value;
  orders = orders.filter(o => o.OrderCode !== orderId);
  
  closeEditModal();
  drawGantt();
  saveDataToServer();
  showStatusMessage('任务删除成功', 'success');
}

// ===== 关闭模态框 =====
function closeEditModal() {
  document.getElementById('editOrderModal').style.display = 'none';
}

function closeDetailsModal() {
  document.getElementById('orderDetailsModal').style.display = 'none';
}



// ===== 数据加载 =====
async function loadData() {
  try {
    showStatusMessage('正在加载数据...', 'info');
    const response = await fetch(`${API_BASE_URL}/api/data`);
    const data = await response.json();
    
    resources = data.resources || [];
    dates = data.dates || [];
    orders = data.orders || [];
    
    console.log('加载的数据:', { resources, dates, orders });
    
    if (resources.length === 0 || dates.length === 0) {
      showStatusMessage('暂无数据，请添加资源或订单', 'warning');
    } else {
      hideStatusMessage();
    }
    
    drawGantt();
  } catch (error) {
    console.error('加载数据失败:', error);
    showStatusMessage('加载数据失败，请检查服务器', 'error');
  }
}



// ===== 数据保存 =====
async function saveDataToServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resources: resources,
        dates: dates,
        orders: orders
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP错误! 状态: ${response.status}`);
    }

    const result = await response.json();
    showStatusMessage('数据保存成功', 'success');
  } catch (error) {
    console.error('保存数据失败:', error);
    showStatusMessage('保存数据失败: ' + error.message, 'error');
  }
}

// ===== 状态消息 =====
function showStatusMessage(message, type = 'info') {
  const statusDiv = document.getElementById('statusMessage');
  if (!statusDiv) {
    // 创建消息元素如果不存在
    const div = document.createElement('div');
    div.id = 'statusMessage';
    div.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 20px; border-radius: 4px; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
    document.body.appendChild(div);
  }
  
  const msgDiv = document.getElementById('statusMessage');
  const typeClasses = {
    success: 'alert-success',
    error: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info'
  };
  
  msgDiv.innerHTML = `
    <div class="alert ${typeClasses[type] || 'alert-info'}" role="alert">
      <i class="fas fa-${getIconForType(type)}"></i>
      ${message}
    </div>
  `;
  
  setTimeout(() => {
    msgDiv.innerHTML = '';
  }, 3000);
}

function hideStatusMessage() {
  const statusDiv = document.getElementById('statusMessage');
  if (statusDiv) {
    statusDiv.innerHTML = '';
  }
}

function getIconForType(type) {
  const icons = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };
  return icons[type] || 'info-circle';
}

// ===== 主题切换 =====
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', function() {
  console.log("初始化现代化甘特图...");
  
  // 加载保存的主题
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }
  
  // 绑定事件
  bindEvents();
  
  // 加载数据
  loadData();
});

function bindEvents() {
  // 模态框关闭
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
      this.closest('.modal').style.display = 'none';
    });
  });

  // 点击模态框外部关闭
  window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });

  // 键盘事件
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
    }
  });
}

// ===== 兼容现有HTML的函数 =====
function toggleInvertColors() {
  document.body.classList.toggle('dark-theme');
  const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
}

function showAddTaskModal() {
  // 填充资源下拉框
  const resourceSelect = document.getElementById('taskResource');
  if (resourceSelect) {
    resourceSelect.innerHTML = '';
    resources.forEach(resource => {
      const option = document.createElement('option');
      option.value = resource;
      option.textContent = resource;
      resourceSelect.appendChild(option);
    });
  }
  
  document.getElementById('taskFormTitle').innerHTML = '<i class="fas fa-plus"></i> 添加任务';
  document.getElementById('taskName').value = '';
  document.getElementById('taskName').dataset.id = '';
  if (document.getElementById('taskResource')) document.getElementById('taskResource').value = resources[0] || '';
  document.getElementById('taskStart').value = '';
  document.getElementById('taskEnd').value = '';
  document.getElementById('taskColor').value = '#3498db';
  document.getElementById('taskInfo').value = '';
  
  document.getElementById('taskFormModal').style.display = 'block';
}

function closeTaskModal() {
  document.getElementById('taskModal').style.display = 'none';
}

function closeTaskFormModal() {
  document.getElementById('taskFormModal').style.display = 'none';
}

// ===== 显示任务详情 =====
function showTaskDetails(order) {
  window.currentTask = order;
  
  const modal = document.getElementById('taskModal');
  
  // 填充资源下拉框
  const resourceSelect = document.getElementById('detailTaskResource');
  if (resourceSelect) {
    resourceSelect.innerHTML = '';
    resources.forEach(resource => {
      const option = document.createElement('option');
      option.value = resource;
      option.textContent = resource;
      resourceSelect.appendChild(option);
    });
  }
  
  // 填充表单数据
  document.getElementById('detailTaskName').value = order.display_info;
  document.getElementById('detailTaskResource').value = order.resource;
  document.getElementById('detailTaskStart').value = order.starttime;
  document.getElementById('detailTaskEnd').value = order.endtime;
  document.getElementById('detailTaskId').value = order.OrderCode;
  
  if (modal) modal.style.display = 'block';
}

function saveTask() {
  const display_info = document.getElementById('taskName').value.trim();
  const resource = document.getElementById('taskResource').value;
  const starttime = document.getElementById('taskStart').value;
  const endtime = document.getElementById('taskEnd').value;

  if (!display_info || !resource || !starttime || !endtime) {
    showStatusMessage('请填写必填字段！', 'error');
    return;
  }

  if (new Date(starttime) > new Date(endtime)) {
    showStatusMessage('开始日期不能晚于结束日期', 'error');
    return;
  }

  // 为新任务生成颜色
  let color = getTaskColor(display_info, resource);
  
  const order = {
    OrderCode: document.getElementById('taskName').dataset.id || Date.now().toString(),
    display_info,
    resource,
    starttime,
    endtime,
    color: color || getTaskColor(display_info, resource)
  };

  const existingIndex = orders.findIndex(o => o.OrderCode === order.OrderCode);
  if (existingIndex >= 0) {
    orders[existingIndex] = order;
  } else {
    orders.push(order);
  }

  closeTaskFormModal();
  drawGantt();
  saveDataToServer();
  showStatusMessage('任务保存成功', 'success');
}

function editTask(taskId) {
  const order = orders.find(o => o.OrderCode === taskId);
  if (order) {
    document.getElementById('taskFormTitle').innerHTML = '<i class="fas fa-edit"></i> 编辑任务';
    document.getElementById('taskName').value = order.display_info;
    document.getElementById('taskName').dataset.id = order.OrderCode;
    document.getElementById('taskResource').value = order.resource;
    document.getElementById('taskStart').value = order.starttime;
    document.getElementById('taskEnd').value = order.endtime;
    document.getElementById('taskFormModal').style.display = 'block';
  }
}

function deleteTask(taskId) {
  if (confirm('确定要删除这个任务吗？')) {
    orders = orders.filter(o => o.OrderCode !== taskId);
    drawGantt();
    saveDataToServer();
    showStatusMessage('任务删除成功', 'success');
  }
}

// ===== 保存任务详情修改 =====
function saveTaskDetail() {
  const orderId = document.getElementById('detailTaskId').value;
  const display_info = document.getElementById('detailTaskName').value.trim();
  const resource = document.getElementById('detailTaskResource').value;
  const starttime = document.getElementById('detailTaskStart').value;
  const endtime = document.getElementById('detailTaskEnd').value;

  if (!display_info || !resource || !starttime || !endtime) {
    showStatusMessage('请填写必填字段！', 'error');
    return;
  }

  if (new Date(starttime) > new Date(endtime)) {
    showStatusMessage('开始日期不能晚于结束日期', 'error');
    return;
  }

  const orderIndex = orders.findIndex(o => o.OrderCode === orderId);
  if (orderIndex >= 0) {
    orders[orderIndex] = {
      ...orders[orderIndex],
      display_info,
      resource,
      starttime,
      endtime,
      color: orders[orderIndex].color || getTaskColor(display_info, resource)
    };

    closeTaskModal();
    drawGantt();
    saveDataToServer();
    showStatusMessage('任务修改成功', 'success');
  }
}

// ===== 删除当前任务 =====
function deleteCurrentTask() {
  const orderId = document.getElementById('detailTaskId').value;
  
  if (confirm('确定要删除这个任务吗？删除后无法恢复！')) {
    orders = orders.filter(o => o.OrderCode !== orderId);
    closeTaskModal();
    drawGantt();
    saveDataToServer();
    showStatusMessage('任务删除成功', 'success');
  }
}

// ===== 资源管理功能 =====
function showResourceManager() {
  loadResourceList();
  document.getElementById('resourceModal').style.display = 'block';
}

function closeResourceModal() {
  document.getElementById('resourceModal').style.display = 'none';
}

function loadResourceList() {
  const container = document.getElementById('resourceItems');
  container.innerHTML = '';
  
  resources.forEach((resource, index) => {
    const item = document.createElement('div');
    item.className = 'resource-item';
    item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; margin: 0.25rem 0; background: #f8f9fa; border-radius: 4px;';
    
    item.innerHTML = `
      <span style="font-weight: 500;">${resource}</span>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-sm btn-warning" onclick="editResource(${index})" title="编辑">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteResource(${index})" title="删除">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    container.appendChild(item);
  });
}

function addResource() {
  const newResource = document.getElementById('newResource').value.trim();
  if (!newResource) {
    showStatusMessage('请输入资源名称！', 'error');
    return;
  }
  
  if (resources.includes(newResource)) {
    showStatusMessage('该资源已存在！', 'warning');
    return;
  }
  
  resources.push(newResource);
  document.getElementById('newResource').value = '';
  
  loadResourceList();
  updateResourceSelects();
  saveDataToServer();
  updateStats();
  showStatusMessage('资源添加成功', 'success');
}

function editResource(index) {
  const oldName = resources[index];
  const newName = prompt('请输入新的资源名称：', oldName);
  
  if (newName && newName.trim() && newName !== oldName) {
    const newNameTrimmed = newName.trim();
    if (resources.includes(newNameTrimmed)) {
      showStatusMessage('该资源已存在！', 'warning');
      return;
    }
    
    // 更新资源名称
    resources[index] = newNameTrimmed;
    
    // 更新相关任务中的资源引用
    orders.forEach(order => {
      if (order.resource === oldName) {
        order.resource = newNameTrimmed;
      }
    });
    
    loadResourceList();
    updateResourceSelects();
    drawGantt();
    saveDataToServer();
    updateStats();
    showStatusMessage('资源修改成功', 'success');
  }
}

function deleteResource(index) {
  const resourceName = resources[index];
  const relatedTasks = orders.filter(order => order.resource === resourceName);
  
  if (relatedTasks.length > 0) {
    if (!confirm(`该资源下有 ${relatedTasks.length} 个任务，删除后这些任务将失去负责人，确定要删除吗？`)) {
      return;
    }
  }
  
  resources.splice(index, 1);
  loadResourceList();
  updateResourceSelects();
  drawGantt();
  saveDataToServer();
  updateStats();
  showStatusMessage('资源删除成功', 'success');
}

function updateResourceSelects() {
  // 更新所有资源选择框
  const selects = ['taskResource', 'detailTaskResource'];
  selects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '';
      resources.forEach(resource => {
        const option = document.createElement('option');
        option.value = resource;
        option.textContent = resource;
        select.appendChild(option);
      });
      if (resources.includes(currentValue)) {
        select.value = currentValue;
      }
    }
  });
}

// ===== 任务管理功能 =====
function showTaskManager() {
  loadTaskList();
  document.getElementById('taskManagerModal').style.display = 'block';
}

function closeTaskManager() {
  document.getElementById('taskManagerModal').style.display = 'none';
}

function loadTaskList() {
  const container = document.getElementById('taskItems');
  container.innerHTML = '';
  
  if (orders.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #6c757d;">暂无任务</p>';
    return;
  }
  
  orders.forEach((order, index) => {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; margin: 0.5rem 0; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #007bff;';
    
    item.innerHTML = `
      <div style="flex: 1;">
        <strong>${order.display_info}</strong><br>
        <small style="color: #6c757d;">
          负责人: ${order.resource} | ${order.starttime} ~ ${order.endtime}
        </small>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-sm btn-primary" onclick="editTaskFromManager(${index})" title="编辑">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteTaskFromManager(${index})" title="删除">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    container.appendChild(item);
  });
}

function editTaskFromManager(index) {
  const order = orders[index];
  closeTaskManager();
  
  // 使用现有的任务编辑功能
  window.currentTask = order;
  document.getElementById('detailTaskName').value = order.display_info;
  document.getElementById('detailTaskResource').value = order.resource;
  document.getElementById('detailTaskStart').value = order.starttime;
  document.getElementById('detailTaskEnd').value = order.endtime;
  document.getElementById('detailTaskId').value = order.OrderCode;
  document.getElementById('taskModal').style.display = 'block';
}

function deleteTaskFromManager(index) {
  const order = orders[index];
  if (confirm(`确定要删除任务 "${order.display_info}" 吗？`)) {
    orders.splice(index, 1);
    loadTaskList();
    drawGantt();
    saveDataToServer();
    updateStats();
    showStatusMessage('任务删除成功', 'success');
  }
}

// ===== 日期管理功能 =====
function showDateManager() {
  if (dates.length > 0) {
    document.getElementById('projectStart').value = dates[0];
    document.getElementById('projectEnd').value = dates[1];
  }
  document.getElementById('dateModal').style.display = 'block';
}

function closeDateModal() {
  document.getElementById('dateModal').style.display = 'none';
}

function saveDateRange() {
  const startDate = document.getElementById('projectStart').value;
  const endDate = document.getElementById('projectEnd').value;
  
  if (!startDate || !endDate) {
    showStatusMessage('请选择开始和结束日期！', 'error');
    return;
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    showStatusMessage('开始日期不能晚于结束日期！', 'error');
    return;
  }
  
  // 更新日期数据 - 使用数组格式 [startDate, endDate]
  dates = [startDate, endDate];
  
  closeDateModal();
  drawGantt();
  saveDataToServer();
  updateStats();
  showStatusMessage('项目周期更新成功', 'success');
}

// ===== 更新统计信息 =====
function updateStats() {
  document.getElementById('resourceCount').textContent = resources.length;
  document.getElementById('taskCount').textContent = orders.length;
  
  if (dates.length >= 2) {
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[1]);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const dateRange = `${startDate.toLocaleDateString('zh-CN')} - ${endDate.toLocaleDateString('zh-CN')} (${diffDays}天)`;
    document.getElementById('dateRange').textContent = dateRange;
  } else {
    document.getElementById('dateRange').textContent = '-';
  }
}