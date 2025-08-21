const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3003;

// 使用中间件
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));
app.use(express.static('.'));

// 数据文件路径
const dataDir = path.join(__dirname, 'data');
const resourcesFile = path.join(dataDir, 'resource.csv');
const datesFile = path.join(dataDir, 'dates.csv');
const ordersFile = path.join(dataDir, 'orders.csv');

// 读取数据的接口
app.get('/api/data', (req, res) => {
  try {
    // 读取 resources
    let resources = [];
    if (fs.existsSync(resourcesFile)) {
      const resourcesData = fs.readFileSync(resourcesFile, 'utf8');
      resources = resourcesData.trim().split('\n').slice(1); // 去掉标题行
    }

    // 读取 dates
    let dates = [];
    if (fs.existsSync(datesFile)) {
      const datesData = fs.readFileSync(datesFile, 'utf8');
      const lines = datesData.trim().split('\n');
      if (lines.length > 1) {
        const values = lines[1].split(',');
        dates = [values[0], values[1]]; // [start_date, end_date]
      }
    }

    // 读取 orders
    let orders = [];
    if (fs.existsSync(ordersFile)) {
      const ordersData = fs.readFileSync(ordersFile, 'utf8');
      const lines = ordersData.trim().split('\n');
      const headers = lines[0].split(',');
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          // 使用更健壮的CSV解析方法
          const line = lines[i];
          const values = [];
          let current = '';
          let inQuotes = false;
          let j = 0;
          
          while (j < line.length) {
            const char = line[j];
            
            if (char === '"') {
              if (inQuotes && line[j + 1] === '"') {
                // 转义引号
                current += '"';
                j += 2;
                continue;
              } else {
                inQuotes = !inQuotes;
                j++;
                continue;
              }
            }
            
            if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
            j++;
          }
          
          // 添加最后一个字段
          values.push(current.trim());
          
          // 移除字段的引号
          const cleanValues = values.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
          
          const order = {};
          headers.forEach((header, index) => {
            order[header] = cleanValues[index] || '';
          });
          orders.push(order);
        }
      }
    }

    res.json({
      resources,
      dates,
      orders
    });
  } catch (error) {
    console.error('读取数据时出错:', error);
    res.status(500).json({ error: '读取数据失败' });
  }
});

// 保存数据的接口
app.post('/api/data', (req, res) => {
  try {
    const { resources, dates, orders } = req.body;
    
    // 打印接收到的数据，用于调试
    console.log('接收到的数据:', { resources, dates, orders });

    // 保存 resources
    let resourcesCsv = 'resource\n';
    if (resources && Array.isArray(resources)) {
      resourcesCsv += resources.join('\n');
    }
    fs.writeFileSync(resourcesFile, resourcesCsv);

    // 保存 dates
    let datesCsv = 'start_date,end_date\n';
    if (dates && Array.isArray(dates) && dates.length >= 2) {
      datesCsv += `${dates[0]},${dates[1]}`;
    }
    fs.writeFileSync(datesFile, datesCsv);

    // 保存 orders
    let ordersCsv = 'OrderCode,starttime,endtime,display_info,resource,color\n';
    if (orders && Array.isArray(orders)) {
      orders.forEach(o => {
        // 清理字段值中的引号，避免双重引号
        const orderCode = String(o.OrderCode || '').replace(/"/g, '');
        const startTime = String(o.starttime || '').replace(/"/g, '');
        const endTime = String(o.endtime || '').replace(/"/g, '');
        const displayInfo = String(o.display_info || '').replace(/"/g, '');
        const resource = String(o.resource || '').replace(/"/g, '');
        const color = String(o.color || '').replace(/"/g, '');
        
        // 只在必要时添加引号（包含逗号的字段）
        const formatValue = (value) => {
          if (value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        };
        
        ordersCsv += `${formatValue(orderCode)},${formatValue(startTime)},${formatValue(endTime)},${formatValue(displayInfo)},${formatValue(resource)},${formatValue(color)}\n`;
      });
    }
    fs.writeFileSync(ordersFile, ordersCsv);

    res.json({ success: true, message: '数据保存成功' });
  } catch (error) {
    console.error('保存数据时出错:', error);
    res.status(500).json({ error: '保存数据失败', message: error.message });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`甘特图服务器运行在 http://localhost:${port}`);
});