# คู่มือการ Deploy บน Vercel

## ขั้นตอนการ Deploy Frontend บน Vercel

### 1. เตรียมโปรเจกต์

#### 1.1 ตรวจสอบไฟล์ที่จำเป็น
- ✅ `package.json` - มีอยู่แล้ว
- ✅ `next.config.js` - มีอยู่แล้ว
- ✅ `vercel.json` - สร้างไว้แล้ว

#### 1.2 สร้างไฟล์ `.env.local` สำหรับ development (ไม่ต้อง commit)
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 2. Deploy บน Vercel

#### วิธีที่ 1: ใช้ Vercel CLI (แนะนำ)

```bash
# ติดตั้ง Vercel CLI
npm i -g vercel

# Login เข้า Vercel
vercel login

# เข้าไปที่โฟลเดอร์ frontend
cd frontend

# Deploy (ครั้งแรก)
vercel

# Deploy production
vercel --prod
```

#### วิธีที่ 2: ใช้ GitHub Integration (แนะนำสำหรับ production)

1. Push โค้ดไปยัง GitHub repository
2. ไปที่ [vercel.com](https://vercel.com)
3. คลิก "Add New Project"
4. เลือก repository ของคุณ
5. ตั้งค่า:
   - **Framework Preset**: Next.js (จะ detect อัตโนมัติ)
   - **Root Directory**: `frontend` (ถ้า repo อยู่ที่ root)
   - **Environment Variables**: 
     - `NEXT_PUBLIC_API_URL` = URL ของ backend API (เช่น `https://your-backend.com`)
6. คลิก "Deploy"

### 3. ตั้งค่า Environment Variables บน Vercel

หลังจาก deploy แล้ว ให้ตั้งค่า Environment Variables:

1. ไปที่ Project Settings → Environment Variables
2. เพิ่มตัวแปร:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: URL ของ backend API (เช่น `https://your-backend.com`)
   - **Environment**: Production, Preview, Development (เลือกทั้งหมด)

### 4. ตั้งค่า Custom Domain (ถ้าต้องการ)

1. ไปที่ Project Settings → Domains
2. เพิ่ม domain ของคุณ
3. ตั้งค่า DNS records ตามที่ Vercel แนะนำ

---

## ⚠️ สิ่งสำคัญที่ต้องรู้

### Backend (Laravel) ต้อง Deploy แยก

Vercel **ไม่รองรับ** Laravel โดยตรง เพราะ Vercel เป็น platform สำหรับ serverless functions

**ตัวเลือกสำหรับ Backend:**

1. **Railway** (แนะนำ)
   - รองรับ Laravel เต็มรูปแบบ
   - ตั้งค่าค่อนข้างง่าย
   - มี free tier

2. **Render**
   - รองรับ Laravel
   - มี free tier

3. **Heroku**
   - รองรับ Laravel
   - มี free tier (จำกัด)

4. **DigitalOcean / AWS / Google Cloud**
   - ต้องตั้งค่าเอง
   - ยืดหยุ่นสูง

5. **VPS (เช่น Contabo, Hetzner)**
   - ราคาถูก
   - ต้องจัดการเอง

### CORS Configuration

ต้องตั้งค่า CORS บน backend ให้รองรับ domain ของ Vercel:

ใน `backend/config/cors.php`:
```php
'allowed_origins' => [
    'https://your-vercel-app.vercel.app',
    'https://your-custom-domain.com',
],
```

### Storage Files

ถ้า backend ใช้ file storage:
- ใช้ **Cloud Storage** (เช่น AWS S3, Cloudinary) แทน local storage
- หรือใช้ **CDN** สำหรับ serve static files

---

## 📋 Checklist ก่อน Deploy

- [ ] ทดสอบ build local: `npm run build`
- [ ] ตั้งค่า `NEXT_PUBLIC_API_URL` บน Vercel
- [ ] Deploy backend ก่อน (เพื่อให้มี API URL)
- [ ] ตั้งค่า CORS บน backend
- [ ] ทดสอบการเชื่อมต่อ API
- [ ] ตรวจสอบ environment variables ทั้งหมด

---

## 🔧 Troubleshooting

### Build Error
- ตรวจสอบว่า dependencies ติดตั้งครบ: `npm install`
- ลองลบ `node_modules` และ `.next` แล้ว build ใหม่

### API Connection Error
- ตรวจสอบ `NEXT_PUBLIC_API_URL` ถูกต้อง
- ตรวจสอบ CORS settings บน backend
- ตรวจสอบว่า backend ทำงานอยู่

### Image Loading Error
- ตรวจสอบ `getStorageUrl()` function
- ตรวจสอบว่า backend serve images ได้ถูกต้อง

---

## 📚 เอกสารเพิ่มเติม

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

