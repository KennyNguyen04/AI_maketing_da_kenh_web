import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Lưu ảnh vào thư mục 'screenshots' ở thư mục gốc dự án
const SCREENSHOTS_DIR = path.resolve(process.cwd(), '../screenshots');

const ROUTES = [
  { name: 'Landing-Page', path: '/' },
  { name: 'Login', path: '/login' },
  { name: 'Register', path: '/register' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Onboarding', path: '/onboarding' },
  { name: 'Review', path: '/review/job-001' }, // Sử dụng jobId mock để xem trang review thực tế
];

const BASE_URL = 'http://localhost:3000';

async function takeScreenshots() {
  console.log(`Bắt đầu chụp ảnh màn hình (Đã bật chế độ MOCK AUTH)...`);
  
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    console.log(`Đã tạo thư mục: ${SCREENSHOTS_DIR}`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    try {
      console.log(`Đang truy cập: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      
      // Chờ thêm 3 giây để Next.js render client-side component hoàn chỉnh
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const filePath = path.join(SCREENSHOTS_DIR, `${route.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`✅ Đã lưu ảnh: ${route.name}.png`);
    } catch (error) {
      console.error(`❌ Lỗi khi chụp ${url}:`, error.message);
    }
  }

  await browser.close();
  console.log(`🎉 Hoàn tất! Ảnh được lưu tại: ${SCREENSHOTS_DIR}`);
}

takeScreenshots().catch(console.error);
