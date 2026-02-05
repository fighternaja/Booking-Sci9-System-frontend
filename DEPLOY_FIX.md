# 🔧 แก้ไขปัญหา Vercel CLI Path Error

## ปัญหา
```
Error: The provided path "D:\booking\frontend\D:\booking" does not exist
```

## วิธีแก้ไข

### วิธีที่ 1: ระบุ Path อย่างชัดเจน

เมื่อ Vercel ถาม "In which directory is your code located?" ให้พิมพ์:
```
.
```
(แค่จุดเดียว หมายถึง directory ปัจจุบัน)

หรือพิมพ์:
```
D:\booking\frontend
```

### วิธีที่ 2: ลบ Cache และลองใหม่

```bash
# ลบ .vercel folder (cache)
rmdir /s /q .vercel

# หรือถ้าใช้ PowerShell
Remove-Item -Recurse -Force .vercel -ErrorAction SilentlyContinue

# รัน vercel อีกครั้ง
vercel
```

### วิธีที่ 3: ใช้ GitHub Integration (แนะนำ - ง่ายกว่า)

1. **Push โค้ดไป GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel"
   git push origin main
   ```

2. **ไปที่ [vercel.com](https://vercel.com)**
   - Login ด้วย GitHub
   - คลิก "Add New Project"
   - เลือก repository ของคุณ

3. **ตั้งค่า Project**
   - **Root Directory**: เลือก `frontend` หรือพิมพ์ `frontend`
   - **Framework Preset**: Next.js (auto-detect)
   - คลิก "Deploy"

4. **ตั้งค่า Environment Variables**
   - ไปที่ Settings → Environment Variables
   - เพิ่ม `NEXT_PUBLIC_API_URL` = URL ของ backend

### วิธีที่ 4: ใช้ Vercel CLI แบบระบุ Path

```bash
# ระบุ root directory ตั้งแต่แรก
vercel --cwd .
```

หรือ

```bash
# ใช้ flag --yes เพื่อ skip คำถาม
vercel --yes
```

---

## ✅ ขั้นตอนที่แนะนำ (ใช้ GitHub)

1. ✅ Push โค้ดไป GitHub
2. ✅ ไปที่ vercel.com → Import Project
3. ✅ เลือก Root Directory: `frontend`
4. ✅ เพิ่ม Environment Variable: `NEXT_PUBLIC_API_URL`
5. ✅ Deploy!

วิธีนี้จะไม่มีปัญหาเรื่อง path และง่ายกว่า CLI มาก

